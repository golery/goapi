/** This service supports synchronizing list of data record. Data is just string without schema */
import { DataRecord } from '../entity-mikro/record.entity';
import { Ctx } from 'types/context';
import { orm } from './Init';
import * as _ from 'lodash';

export function fetchRecord(ctx: Ctx, fromTime?: Date): Promise<Record<string, any[]>> {
  const em = orm.em;
  return em.find(DataRecord, { updatedAt: { $gt: fromTime ?? new Date(0)} })
    .then(records => {
      const dataMap = _.mapValues(_.groupBy(records, 'type'), (value) => {
        return _.sortBy(value, ['updatedAt']);
      });
      console.log(`Fetch records fromTime ${fromTime}. Found ${records.length}`);
      return dataMap;
    });
}


export async function upsertRecords(ctx: Ctx, recordMap: Record<string, any[]>): Promise<void> {
  console.log('Upserting records', recordMap);
  const records = Object.entries(recordMap).flatMap(([type, data]) => {
    return data.map(item => {
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
