import { DataRecord } from '../entity-mikro/record.entity';
import { Ctx } from 'types/context';
import { orm } from './Init';
import * as uuid from 'uuid';
import * as _ from 'lodash';

export async function syncRecords(ctx: Ctx, dataMap: Record<string, object[]>) {
  const em = orm.em;
  const o = new DataRecord();
  Object.assign(o, {
    userId: 1,
    appId: 2,
    groupId: 3,
    data: { a: 'hello' },
    type: 'test',
  });
  await em.persistAndFlush(o);
  const a = await em.findAll(DataRecord);

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
  const dataMap2 = _.groupBy(a, 'type');
  console.log('===>', dataMap2);
  return dataMap2;
}
