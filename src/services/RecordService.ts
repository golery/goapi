/** This service supports synchronizing list of data record. Data is just string without schema */

import { Ctx } from './../types/context.d';
import { DataRecord } from '../entity/Record.entity';
import { getEm, orm } from './db';
import * as _ from 'lodash';
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

async function fetchRecords(
    ctx: Ctx,
    fromTime?: Date,
): Promise<Record<string, DataRecord[]>> {
    if (!ctx.groupId) {
        throw new ServerError(400, 'Failed to fetch records, there is no groupId');
    }
    const em = getEm();
    const records = await em
        .find(DataRecord, {
            groupId: ctx.groupId,
            updatedAt: { $gt: fromTime ?? new Date(0) },
        })

    const dataMap = _.mapValues(_.groupBy(records, 'type'), (value) => {
        return _.sortBy(value, ['updatedAt']).map(record => toSyncRow(record));
    });
    logger.info(
        `Fetched records from time ${fromTime}. Found ${records.length}`,
    );
    return dataMap;

}

async function upsertRecords(
    ctx: Ctx,
    recordMap: Record<string, DataRecord[]>,
) {
    const records = Object.entries(recordMap).flatMap(([type, data]) => {
        return data.map((item) => {
            const record = new DataRecord();
            logger.info('MAP' + JSON.stringify(item));
            Object.assign(record, {
                id: item.id ?? uuid.v4(),
                data: item,
                userId: ctx.userId,
                appId: ctx.appId,
                groupId: ctx.groupId,
                type,
            });
            return record;
        });
    });

    if (records.length > 0) {
        const startTime = Date.now();
        logger.info(`Upserting ${records.length} records`, { ctx, records });

        const em = getEm();
        await em.upsertMany(records);
        logger.info(`Upserted ${records.length} records in ${Date.now() - startTime}ms`);
    }
}

export async function syncRecords(
    ctx: Ctx,
    fromTime: number,
    upsert: Record<string, DataRecord[]>,
): Promise<{ records: Record<string, DataRecord[]>; timestamp: number }> {
    logger.info(`Syncing records...`);
    const t1 = Date.now();
    const t2 = Date.now();
    if (upsert !== undefined) {
        logger.debug(`Upserting ${Object.keys(upsert).length} records`, { ctx, upsert });
        await upsertRecords(ctx, upsert);
        logger.info(`Upserted records in ${Date.now() - t2}ms`);
    }
    const t3 = Date.now();
    const records = await fetchRecords(ctx, new Date(fromTime));
    logger.info(`Fetched records in ${Date.now() - t3}ms`);
    logger.info(`Done.Synced records in ${Date.now() - t1}ms`);
    return { records, timestamp: Date.now() };
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
