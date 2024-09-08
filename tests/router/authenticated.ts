import { app } from '../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER, GROUP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';
import { createUser as setupUser } from '../testutils/setup';
import * as _ from 'lodash';
import { getRandomInt } from '../testutils/random';

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
        it('#ping', async () => {
            const { accessToken } = await setupUser();
            const response: any = await request(app)
                .get('/api/ping')
                .set('Authorization', `Bearer ${accessToken}`)
                .set(GROUP_ID_HEADER, `${getRandomInt()}`)   
                .expect(200);
            assert.equal(response.appId, APP_ID_HEADER);
            assert.isNumber(response.userId);
        });
    });
});
