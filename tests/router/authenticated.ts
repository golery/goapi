import { app } from '../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER, AppIds, GROUP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';
import { sendRequest, setupUser } from '../testutils/setup';
import * as _ from 'lodash';
import { getRandomInt } from '../testutils/random';
import { CreateGroupResponse, GetUserResponse } from '../../src/types/schemas';

describe('router/authenticated', () => {
    before(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    after(async () => {
        await closeDb();
    });
    describe('record', () => {
        it('#sync', async () => {
            const testUser = await setupUser();
            const random = uuid.v4();
            const response: any = await sendRequest(testUser, request(app)
                .put('/api/record/sync')
                .set(GROUP_ID_HEADER, `${getRandomInt()}`)
                .send({ records: { test: [{ random }] } }));
            console.log(response.records.test);
            const saved = response.records.test.find(o => o.random === random);
            assert.deepEqual(_.pick(saved, ['random']), { random });
        });
    });

    describe('group', () => {
        it('#it.create group then get user info', async () => {
            const testUser = await setupUser();
            const group: CreateGroupResponse = await sendRequest(testUser, request(app)
                .post('/api/group')            
            );
            assert.equal(group.appId, AppIds.TEST);

            const userInfo: GetUserResponse = await sendRequest(testUser, request(app)
                .get('/api/user'));
            assert.deepEqual(userInfo.groupIds, [group.id]);
        });
    });
});
