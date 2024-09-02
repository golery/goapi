import { app } from './../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/Init';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';

describe('router/public', function () {
    before(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    after(async () => {
        console.log('DONE');
        await closeDb();
    });
    describe('signup', function () {
        it('#signup', async () => {
            const random = uuid.v4();
            const response: any = await request(app)
                .put('/api/public/signup')            
                .send({ appId: 1, email: 'test' + random + '@test.com', password: 'test' })
                .expect(200);
                console.log(response.body.records.test);        
        });
    });
});
