import { app } from './../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/Init';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';

describe('authenticated', function () {
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
            const random = uuid.v4();
            const response: any = await request(app)
                .put('/api/record/sync')
                .set(APP_ID_HEADER, '-1')                                    
                .send({ records: { test: [{ random }] } })
                .expect(200);
                console.log(response.body.records.test);
            const saved = response.body.records.test.find(o => o.data.random === random);
            assert.deepEqual(saved, { random});
        });
    });
});
