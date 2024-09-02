import { SignInRequest } from './../../src/types/schemas';
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
    describe('signup/signin', function () {
        it('#it.signs up then signs in', async () => {
            const email = `test+${uuid.v4()}@test.com`;
            const password = 'Ab!12345';

            // when sign up for a new account
            const { body: signUpResponse } = await request(app)
                .post('/api/public/signup')
                .send({ appId: 1, email, password })
                .expect(200);        
            // then there is a token in response    
            assert.isNotEmpty(signUpResponse.token);

            // then can sign in with the new account
            const { body: SignInResponse } = await request(app)
                .post('/api/public/signin')
                .send({ appId: 1, email, password })
                .expect(200);
            assert.isNotEmpty(signUpResponse.token);
        });
    });
}); 
