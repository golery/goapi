/** This service supports synchronizing list of data record. Data is just string without schema */

import { Ctx } from './../types/context.d';
import { DataRecord } from '../entity/Record.entity';
import { getEm } from './db';
import logger from '../utils/logger';
import { ServerError } from '../utils/errors';
import * as uuid from 'uuid';

export const DELTA_TABLES = [
    'products',
    'categories',
    'transactions',
    'orders',
    'order_lines',
    'contacts',
    'storages',
    'field_defs',
] as const;

/** Delta table name to the underlying record types in the record table. */
const deltaTableTypes: Record<string, string[]> = {
    products: ['products'],
    categories: ['categories'],
    transactions: ['transactions'],
    orders: ['orders'],
    order_lines: ['orders'],
    contacts: ['suppliers', 'customers'],
    storages: ['storages'],
    field_defs: ['customFields'],
};

export type DeltaTable = keyof typeof deltaTableTypes;

export function isDeltaTable(table: string): table is DeltaTable {
    return Object.prototype.hasOwnProperty.call(deltaTableTypes, table);
}

export interface DeltaPage {
    records: Record<string, any>[];
    serverTimestamp: number;
    hasMore: boolean;
}

/** One synced row in the shape the phone merges. Phone updateTime wins over
 * the server write time, so newer-wins stays a client-clock decision. */
function toSyncRow(record: DataRecord) {
    return {
        id: record.id,
        deleted: false,
        updateTime: record.updatedAt.getTime(),
        createTime: record.createdAt.getTime(),
        ...record.data,
    } as any;
}

/**
 * Phone tables accepted by the commit endpoint, keyed exactly as the phone
 * sends them. The delta endpoint maps these storage types back to its own
 * table names (suppliers + customers -> contacts, customFields ->
 * field_defs, orders -> order_lines).
 */
export const COMMIT_TABLES = [
    'products',
    'categories',
    'transactions',
    'orders',
    'suppliers',
    'customers',
    'storages',
    'customFields',
] as const;

export type CommitTable = (typeof COMMIT_TABLES)[number];

function isCommitTable(table: string): table is CommitTable {
    return (COMMIT_TABLES as readonly string[]).includes(table);
}

export interface CommitResult {
    accepted: Record<string, number>;
    timestamp: number;
}

/**
 * Blind upsert of the phone's dirty rows: the phone always wins, no
 * timestamp comparison. Rows (including tombstones with `deleted: true`)
 * are stored verbatim so the delta pull can propagate them.
 */
export async function commitRecords(
    ctx: Ctx,
    recordMap: Record<string, unknown[]>,
): Promise<CommitResult> {
    if (!ctx.groupId) {
        throw new ServerError(400, 'Failed to commit records, there is no groupId');
    }
    if (recordMap === undefined || recordMap === null || typeof recordMap !== 'object') {
        throw new ServerError(400, 'Failed to commit records, body.records must be an object');
    }
    const accepted: Record<string, number> = {};
    const records: DataRecord[] = [];
    for (const [type, items] of Object.entries(recordMap)) {
        if (!isCommitTable(type)) {
            throw new ServerError(400, `Unknown commit table ${type}`);
        }
        if (!Array.isArray(items)) {
            throw new ServerError(400, `Invalid records for table ${type}, must be an array`);
        }
        accepted[type] = items.length;
        for (const item of items) {
            const record = new DataRecord();
            Object.assign(record, {
                id: (item as any)?.id ?? uuid.v4(),
                data: item,
                userId: ctx.userId,
                appId: ctx.appId,
                groupId: ctx.groupId,
                type,
            });
            records.push(record);
        }
    }

    if (records.length > 0) {
        const startTime = Date.now();
        const em = getEm();
        await em.upsertMany(records);
        logger.info(`Committed ${records.length} records in ${Date.now() - startTime}ms`);
    }
    return { accepted, timestamp: Date.now() };
}

/**
 * One delta page of [table] changed since [sinceMs] (server ms).
 *
 * Keyset paging on (updatedAt, id): rows with updatedAt after [sinceMs],
 * plus rows stamped exactly at [sinceMs] with id after [afterId].
 * The boundary repeats instead of skipping, and the phone merge is
 * idempotent, so a same-millisecond write can never be lost.
 * Parent rows are never split: the limit counts parents, and order_lines
 * pages carry every line of each parent on the page.
 */
export async function fetchDeltaRecords(
    ctx: Ctx,
    table: string,
    sinceMs: number,
    limit: number,
    afterId?: string,
): Promise<DeltaPage> {
    if (!ctx.groupId) {
        throw new ServerError(400, 'Failed to fetch delta, there is no groupId');
    }
    if (!isDeltaTable(table)) {
        throw new ServerError(400, `Unknown delta table ${table}`);
    }
    const take = Math.min(Math.max(Math.floor(limit) || 200, 1), 1000);
    const since = new Date(Number.isNaN(sinceMs) ? 0 : sinceMs);
    const em = getEm();
    // Keyset on (updatedAt, id). The first page uses >= so a row written
    // in the same millisecond as the previous response is repeated, never
    // lost; the phone merge is idempotent. Later pages resume after the
    // anchor row's own timestamp, looked up fresh so a concurrent rewrite
    // of the anchor cannot skip or repeat rows.
    let timeFilter: Record<string, any>;
    if (afterId) {
        const anchor = await em.findOne(DataRecord, {
            id: afterId,
            groupId: ctx.groupId,
        });
        const cursorTs = anchor ? anchor.updatedAt : since;
        timeFilter = {
            $or: [
                { updatedAt: { $gt: cursorTs } },
                { updatedAt: cursorTs, id: { $gt: afterId } },
            ],
        };
    } else {
        timeFilter = { updatedAt: { $gte: since } };
    }
    const parents = await em.find(
        DataRecord,
        {
            groupId: ctx.groupId,
            type: { $in: deltaTableTypes[table] },
            ...timeFilter,
        },
        {
            orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
            limit: take + 1,
        },
    );
    const hasMore = parents.length > take;
    const page = hasMore ? parents.slice(0, take) : parents;

    const records: Record<string, any>[] = [];
    for (const record of page) {
        if (table === 'order_lines') {
            const lines = (record.data as any)?.lines;
            if (Array.isArray(lines)) {
                for (const line of lines) {
                    records.push({ orderId: record.id, id: record.id, line });
                }
            }
            continue;
        }
        const row = toSyncRow(record);
        if (table === 'contacts') {
            row.role = record.type === 'customers' ? 'customer' : 'supplier';
        }
        records.push(row);
    }
    logger.info(
        `Fetched delta ${table} since ${since.toISOString()} after '${afterId ?? ''}'. ` +
        `Found ${records.length}, hasMore=${hasMore}`,
    );
    return { records, serverTimestamp: Date.now(), hasMore };
}
