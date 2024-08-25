/** This service supports synchronizing list of data record. Data is just string without schema */

import { Ctx } from './../types/context.d';
import { DataRecord } from '../entity/record.entity';
import { orm } from './Init';
import * as _ from 'lodash';

async function deleteRecords(ctx: Ctx) {
    const em = orm.em;
    const groupId = ctx.groupId;
    if (groupId === undefined) {
        await em.nativeDelete(DataRecord, { userId: ctx.userId });
    } else {
        await em.nativeDelete(DataRecord, { groupId: ctx.groupId });
    }
}
function fetchRecords(
    ctx: Ctx,
    fromTime?: Date,
): Promise<Record<string, DataRecord[]>> {
    const em = orm.em;
    return em
        .find(DataRecord, {
            groupId: ctx.groupId,
            updatedAt: { $gt: fromTime ?? new Date(0) },
        })
        .then((records) => {
            const dataMap = _.mapValues(_.groupBy(records, 'type'), (value) => {
                return _.sortBy(value, ['updatedAt']);
            });
            console.log(
                `Fetch records fromTime ${fromTime}. Found ${records.length}`,
            );
            return dataMap;
        });
}

async function upsertRecords(
    ctx: Ctx,
    recordMap: Record<string, DataRecord[]>,
) {
    // console.log('Upserting records', recordMap);
    const records = Object.entries(recordMap).flatMap(([type, data]) => {
        console.log('data', data);
        return data.map((item) => {
            const record = new DataRecord();
            Object.assign(record, {
                ...item,
                userId: ctx.userId,
                appId: ctx.appId,
                groupId: ctx.groupId,
                type,
            });
            return record;
        });
    });
    console.log(`Upserting ${records.length} records`, records);

    const em = orm.em;
    await em.upsertMany(records);
    console.log('Upserted records', records);
}

export async function syncRecords(
    ctx: Ctx,
    fromTime: number,
    recordMap: Record<string, DataRecord[]>,
    isDelete: boolean,
): Promise<{ records: Record<string, DataRecord[]>; timestamp: number }> {
    if (isDelete) {
        await deleteRecords(ctx);
    }
    await upsertRecords(ctx, recordMap);
    const records = await fetchRecords(ctx, new Date(fromTime));
    return { records, timestamp: Date.now() };
}
