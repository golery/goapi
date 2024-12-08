/** This service supports synchronizing list of data record. Data is just string without schema */

import * as _ from 'lodash';
import { KeyValue } from '../entity/KeyValue.entity';
import { Ctx } from '../types/context';
import { getEm } from './db';
import { log } from 'console';
import logger from '../utils/logger';

export async function getKeyValues(
    ctx: Ctx,
    keys: string[],
): Promise<KeyValue[]> {
    logger.info(`Loading key values`, { keys });
    const em = getEm();
    return await em
        .find(KeyValue, {
            appId: ctx.appId,
            userId: ctx.userId,
            key: { $in: keys },
        });
}


export async function putKeyValues(
    ctx: Ctx,
    keyValues: KeyValue[],
): Promise<void> {
    const em = getEm();
    const store = keyValues.map((req) => {
        const kv = new KeyValue();
        Object.assign(kv, {
            ...req,
            updatedAt: new Date(),
            createdAt: new Date(),
            userId: ctx.userId,
            appId: ctx.appId,
        });
        return kv;
    })

    await getEm().upsertMany(store);
    await getEm().flush();
    logger.info(`Put ${store.length} key values`);
}
  