import { app } from './../../src/app';
import assert from 'assert';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/Init';
import { loadConfig } from '../../src/services/ConfigService';

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
            const response = await request(app)
                .put('/api/record/sync')
                .send({ records: { test: [{ hello: 'a' }] } })
                .expect(200);
            console.log(response.body);
        });
    });
});
