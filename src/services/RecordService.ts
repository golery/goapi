import { DataRecord } from '../entity-mikro/record.entity';
import { Ctx } from 'types/context';
import { orm } from './Init';
import * as uuid from 'uuid';
import * as _ from 'lodash';

export async function syncRecords(ctx: Ctx, dataMap: Record<string, object[]>, fromTime?: Date) {
  console.log(`Query fromTime ${fromTime}`);
  const em = orm.em;
  const o = new DataRecord();
  Object.assign(o, {
    userId: 1,
    appId: 2,
    groupId: 3,
    data: { a: 'hello' },
    type: 'test',
  });
  // await em.persistAndFlush(o);

  const a = await em.find(DataRecord, { updatedAt: { $gt: fromTime ?? new Date(0)} });

  // const objects = Object.entries(dataMap).flatMap(([key, value]) => {
  //   return value.map(item => ({
  //     ...item,
  //     userId: ctx.userId,
  //     appId: ctx.appId,
  //     groupId: ctx.groupId,
  //     type: key,
  //   }));
  // });
  // return objects;
  const dataMap2 = _.mapValues(_.groupBy(a, 'type'), (value) => {
    return _.sortBy(value, ['updatedAt']);
  });
  return dataMap2;
}


export async function upsertRecords(ctx: Ctx, recordMap: Record<string, object[]>) {
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
  console.log('Upserting records 22', records);

  const em = orm.em;
  await em.upsertMany(records);
  console.log('Upserted records', records);
}
