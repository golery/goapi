/** This service supports synchronizing list of data record. Data is just string without schema */

import { Ctx } from './../types/context.d';
import { DataRecord } from '../entity/Record.entity';
import { getEm, orm } from './db';
import * as _ from 'lodash';
import logger from '../utils/logger';
import { ServerError } from '../utils/errors';
import * as uuid from 'uuid';

async function deleteRecords(ctx: Ctx) {
    const em = getEm();
    const groupId = ctx.groupId;
    if (groupId === undefined) {
        await em.nativeDelete(DataRecord, { userId: ctx.userId });
    } else {
        await em.nativeDelete(DataRecord, { groupId: ctx.groupId });
    }
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
        return _.sortBy(value, ['updatedAt']).map(record => ({
            id: record.id,
            deleted: false,
            updateTime: record.updatedAt.getTime(),
            createTime: record.createdAt.getTime(),
            ...record.data,
        } as any));
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
    isDelete: boolean,
): Promise<{ records: Record<string, DataRecord[]>; timestamp: number }> {
    logger.info(`Syncing records...`);
    const t1 = Date.now();
    if (isDelete) {
        await deleteRecords(ctx);
        logger.info(`Deleted records in ${Date.now() - t1}ms`);
    }
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
