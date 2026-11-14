import { ZodError } from 'zod';
import { Ctx } from '../types/context';
import { StockPullQuerySchema, StockPushSchema, StockPushRequest } from '../types/schemas';
import { ServerError } from '../utils/errors';
import { loadMembership } from './GroupService';
import { getEm } from './db';
import { applyStockEvent, OnHandLine, positionKey, roundQty, StockEvent } from './stockApply';

export type StockOpResult = {
    seq: number;
    opId: string;
    deviceId: string;
    type: string;
    at: number;
    result: 'accepted';
    payload: Record<string, unknown>;
    onHand: OnHandLine[];
};

type StockPushResult = Omit<StockOpResult, 'payload'> & { latestSeq: number };
const PULL_LIMIT = 500;

type OpRow = {
    group_id: number;
    seq: string | number;
    op_id: string;
    device_id: string;
    type: string;
    at_ms: string | number;
    result: string;
    payload: Record<string, unknown> | string;
    on_hand: OnHandLine[] | string;
};

export async function pushStockOp(ctx: Ctx, body: unknown): Promise<StockPushResult> {
    const groupId = requireGroup(ctx);
    await loadMembership(ctx, groupId);
    const request = parsePush(body);
    const stored = await findByOpId(request.op.opId);
    if (stored) {
        return resultForGroup(stored, groupId, await getLatestSeq(groupId));
    }
    try {
        return await insertOp(groupId, ctx.userId, request);
    } catch (err) {
        if (!isUniqueViolation(err)) {
            throw err;
        }
        const again = await findByOpId(request.op.opId);
        if (!again) {
            throw err;
        }
        return resultForGroup(again, groupId, await getLatestSeq(groupId));
    }
}

export async function pullStockOps(
    ctx: Ctx,
    query: unknown,
): Promise<{ timestamp: number; latestSeq: number; nextAfter: number; hasMore: boolean; ops: StockOpResult[] }> {
    const groupId = requireGroup(ctx);
    await loadMembership(ctx, groupId);
    const { after } = parsePull(query);
    const em = getEm().fork();
    const latestSeq = await getLatestSeq(groupId);
    const rows = await execute<OpRow[]>(em,
        `select group_id, seq, op_id, device_id, type,
                (extract(epoch from device_at) * 1000)::bigint as at_ms,
                result, payload, on_hand
         from stock_op
         where group_id = ? and seq > ? and seq <= ?
         order by seq
         limit ?`,
        [groupId, after, latestSeq, PULL_LIMIT],
    );
    const nextAfter = rows.length > 0 ? Number(rows[rows.length - 1].seq) : after;
    return {
        timestamp: Date.now(),
        latestSeq,
        nextAfter,
        hasMore: nextAfter < latestSeq,
        ops: rows.map((row) => toResult(row)),
    };
}

async function insertOp(groupId: number, userId: number, request: StockPushRequest): Promise<StockPushResult> {
    const em = getEm().fork();
    return em.transactional(async (tx) => {
        await execute(tx,
            `insert into stock_counter (group_id, next_seq) values (?, 1)
             on conflict (group_id) do nothing`,
            [groupId],
        );
        await execute(tx,
            `select next_seq from stock_counter where group_id = ? for update`,
            [groupId],
        );

        const again = await execute<OpRow[]>(tx,
            `select group_id, seq, op_id, device_id, type,
                    (extract(epoch from device_at) * 1000)::bigint as at_ms,
                    result, payload, on_hand
             from stock_op where op_id = ?`,
            [request.op.opId],
        );
        if (again.length > 0) {
            const latestRows = await execute<{ latest_seq: string | number }[]>(tx,
                `select next_seq - 1 as latest_seq from stock_counter where group_id = ?`,
                [groupId],
            );
            return resultForGroup(again[0], groupId, Number(latestRows[0].latest_seq));
        }

        await execute(tx,
            `insert into stock_device (device_id, group_id, user_id, last_device_seq)
             values (?, ?, ?, 0)
             on conflict (device_id) do nothing`,
            [request.deviceId, groupId, userId],
        );
        const devices = await execute<{ group_id: number; last_device_seq: string | number }[]>(tx,
            `select group_id, last_device_seq from stock_device where device_id = ? for update`,
            [request.deviceId],
        );
        const device = devices[0];
        if (!device || device.group_id !== groupId) {
            throw new ServerError(409, 'deviceId already used');
        }
        const lastSeq = Number(device.last_device_seq);
        const expected = lastSeq + 1;
        if (request.deviceSeq !== expected) {
            throw new ServerError(409, `Expected device sequence ${expected}`, {
                expectedDeviceSeq: expected,
            });
        }

        const latestRows = await execute<{ latest_seq: string | number }[]>(tx,
            `select next_seq - 1 as latest_seq from stock_counter where group_id = ?`,
            [groupId],
        );
        const latestSeq = Number(latestRows[0].latest_seq);
        if (request.baseSeq > latestSeq) {
            throw new ServerError(409, `baseSeq cannot exceed latest group sequence ${latestSeq}`, {
                latestSeq,
            });
        }
        const event = eventFrom(request);
        const touched = touchedKeys(event);
        const current = await lockPositions(tx, groupId, touched);
        if (request.op.type === 'count') {
            const countOp = request.op;
            const conflicts = countOp.lines.flatMap((line) => {
                const actual = current.get(positionKey(line.productId, countOp.storageId)) ?? 0;
                if (roundQty(actual) === roundQty(line.expected)) {
                    return [];
                }
                return [{
                    productId: line.productId,
                    storageId: countOp.storageId,
                    expected: roundQty(line.expected),
                    actual: roundQty(actual),
                    seen: roundQty(line.seen),
                }];
            });
            if (conflicts.length > 0) {
                throw new ServerError(409, 'Stock changed since the count began', {
                    latestSeq,
                    conflicts,
                });
            }
        }
        const onHand = applyStockEvent(current, event);
        for (const line of onHand) {
            await execute(tx,
                `insert into stock_position (group_id, product_id, storage_id, on_hand)
                 values (?, ?, ?, ?)
                 on conflict (group_id, product_id, storage_id)
                 do update set on_hand = excluded.on_hand`,
                [groupId, line.productId, line.storageId, line.quantity],
            );
        }

        const counters = await execute<{ next_seq: string | number }[]>(tx,
            `update stock_counter set next_seq = next_seq + 1
             where group_id = ?
             returning next_seq - 1 as next_seq`,
            [groupId],
        );
        const seq = Number(counters[0].next_seq);
        const payload = payloadOf(request);
        await execute(tx,
            `insert into stock_op (
                group_id, seq, op_id, device_id, user_id, device_seq, base_seq, v,
                type, payload, device_at, result, on_hand
             ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, to_timestamp(? / 1000.0), 'accepted', ?::jsonb)`,
            [
                groupId,
                seq,
                request.op.opId,
                request.deviceId,
                userId,
                request.deviceSeq,
                request.baseSeq,
                request.op.v,
                request.op.type,
                JSON.stringify(payload),
                request.op.at,
                JSON.stringify(onHand),
            ],
        );
        await execute(tx,
            `update stock_device set last_device_seq = ? where device_id = ?`,
            [request.deviceSeq, request.deviceId],
        );
        return {
            seq,
            latestSeq: seq,
            opId: request.op.opId,
            deviceId: request.deviceId,
            type: request.op.type,
            at: request.op.at,
            result: 'accepted',
            onHand,
        };
    });
}

async function lockPositions(
    tx: ReturnType<ReturnType<typeof getEm>['fork']>,
    groupId: number,
    keys: { productId: string; storageId: string }[],
): Promise<Map<string, number>> {
    const current = new Map<string, number>();
    const ordered = [...keys].sort((a, b) =>
        positionKey(a.productId, a.storageId).localeCompare(positionKey(b.productId, b.storageId)),
    );
    for (const key of ordered) {
        const rows = await execute<{ on_hand: string | number }[]>(tx,
            `select on_hand from stock_position
             where group_id = ? and product_id = ? and storage_id = ?
             for update`,
            [groupId, key.productId, key.storageId],
        );
        const qty = rows.length === 0 ? 0 : Number(rows[0].on_hand);
        current.set(positionKey(key.productId, key.storageId), qty);
    }
    return current;
}

function touchedKeys(event: StockEvent): { productId: string; storageId: string }[] {
    if (event.type === 'receive' || event.type === 'sell') {
        return [{ productId: event.productId, storageId: event.storageId }];
    }
    if (event.type === 'move') {
        return [
            { productId: event.productId, storageId: event.fromStorageId },
            { productId: event.productId, storageId: event.toStorageId },
        ];
    }
    return event.lines.map((line) => ({ productId: line.productId, storageId: event.storageId }));
}

function eventFrom(request: StockPushRequest): StockEvent {
    const op = request.op;
    if (op.type === 'receive' || op.type === 'sell') {
        return { type: op.type, productId: op.productId, storageId: op.storageId, quantity: op.quantity };
    }
    if (op.type === 'move') {
        return {
            type: 'move',
            productId: op.productId,
            fromStorageId: op.fromStorageId,
            toStorageId: op.toStorageId,
            quantity: op.quantity,
        };
    }
    return {
        type: 'count',
        storageId: op.storageId,
        lines: op.lines.map((line) => ({ productId: line.productId, seen: line.seen })),
    };
}

function payloadOf(request: StockPushRequest): Record<string, unknown> {
    const op = request.op;
    if (op.type === 'receive' || op.type === 'sell') {
        return { productId: op.productId, storageId: op.storageId, quantity: op.quantity };
    }
    if (op.type === 'move') {
        return {
            productId: op.productId,
            fromStorageId: op.fromStorageId,
            toStorageId: op.toStorageId,
            quantity: op.quantity,
        };
    }
    return { storageId: op.storageId, lines: op.lines };
}

async function findByOpId(opId: string): Promise<OpRow | undefined> {
    const em = getEm().fork();
    const rows = await execute<OpRow[]>(em,
        `select group_id, seq, op_id, device_id, type,
                (extract(epoch from device_at) * 1000)::bigint as at_ms,
                result, payload, on_hand
         from stock_op where op_id = ?`,
        [opId],
    );
    return rows[0];
}

async function getLatestSeq(groupId: number): Promise<number> {
    const em = getEm().fork();
    const rows = await execute<{ latest_seq: string | number }[]>(em,
        `select coalesce((select next_seq - 1 from stock_counter where group_id = ?), 0) as latest_seq`,
        [groupId],
    );
    return Number(rows[0].latest_seq);
}

async function execute<T>(em: ReturnType<ReturnType<typeof getEm>['fork']>, query: string, params: unknown[] = []): Promise<T> {
    const result = await em.getConnection().execute<T>(query, params as any[], 'all', em.getTransactionContext());
    return (Array.isArray(result) ? result : (result as { rows?: T }).rows ?? []) as T;
}

function resultForGroup(row: OpRow, groupId: number, latestSeq: number): StockPushResult {
    if (Number(row.group_id) !== groupId) {
        throw new ServerError(409, 'opId already used');
    }
    const result = toResult(row);
    return {
        seq: result.seq,
        latestSeq,
        opId: result.opId,
        deviceId: result.deviceId,
        type: result.type,
        at: result.at,
        result: result.result,
        onHand: result.onHand,
    };
}

function toResult(row: OpRow): StockOpResult {
    return {
        seq: Number(row.seq),
        opId: row.op_id,
        deviceId: row.device_id,
        type: row.type,
        at: Number(row.at_ms),
        result: 'accepted',
        payload: asObject(row.payload),
        onHand: asOnHand(row.on_hand),
    };
}

function asObject(value: Record<string, unknown> | string): Record<string, unknown> {
    if (typeof value === 'string') {
        return JSON.parse(value) as Record<string, unknown>;
    }
    return value;
}

function asOnHand(value: OnHandLine[] | string): OnHandLine[] {
    const rows = typeof value === 'string' ? JSON.parse(value) as OnHandLine[] : value;
    return rows.map((line) => ({
        productId: line.productId,
        storageId: line.storageId,
        quantity: Number(line.quantity),
    }));
}

function requireGroup(ctx: Ctx): number {
    if (ctx.groupId === undefined) {
        throw new ServerError(400, 'groupId header is required');
    }
    return ctx.groupId;
}

function parsePush(body: unknown): StockPushRequest {
    try {
        return StockPushSchema.parse(body);
    } catch (err) {
        if (err instanceof ZodError) {
            throw new ServerError(400, 'Invalid stock operation');
        }
        throw err;
    }
}

function parsePull(query: unknown): { after: number } {
    try {
        return StockPullQuerySchema.parse(query);
    } catch (err) {
        if (err instanceof ZodError) {
            throw new ServerError(400, 'Invalid stock pull');
        }
        throw err;
    }
}

function isUniqueViolation(err: unknown): boolean {
    const value = err as { code?: string; cause?: { code?: string } };
    return value?.code === '23505' || value?.cause?.code === '23505';
}
