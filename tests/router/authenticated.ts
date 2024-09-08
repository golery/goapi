import { app } from '../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER, AppIds, GROUP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';
import { sendRequest, createUser as setupUser } from '../testutils/setup';
import * as _ from 'lodash';
import { getRandomInt } from '../testutils/random';
import { GetUserResponse } from '../../src/types/schemas';

describe('router/authenticated', function () {
    before(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    after(async () => {
        console.log('DONE');
        await closeDb();
    });
    describe('record', function () {
        it('#sync', async () => {
            const { accessToken } = await setupUser();
            const random = uuid.v4();
            const response: any = await request(app)
                .put('/api/record/sync')
                .set('Authorization', `Bearer ${accessToken}`)
                .set(GROUP_ID_HEADER, `${getRandomInt()}`)   
                .send({ records: { test: [{ random }] } })
                .expect(200);
                console.log(response.body.records.test);
            const saved = response.body.records.test.find(o => o.random === random);
            assert.deepEqual(_.pick(saved, ['random']), { random});
        });
    });

    describe('group', function () {
        it('#it.create group then get user info', async () => {
            const { accessToken } = await setupUser();
            const { body: group } = await request(app)
                .post('/api/group')                
                .send({ appId: AppIds.TEST })   
                .set('Authorization', `Bearer ${accessToken}`)     
                .expect(200);            
            assert.equal(group.appId, AppIds.TEST );

            const userInfo: GetUserResponse = await sendRequest(accessToken, request(app)
            .get('/api/user'));
            console.log('==>', userInfo);
            assert.deepEqual(userInfo.groupIds, [group.id]);        
        });
    });
});
