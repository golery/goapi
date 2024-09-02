import { assert } from 'chai';
import { describe } from 'mocha';
import request from 'supertest';
import * as uuid from 'uuid';
import { app } from '../../src/app';
import { loadConfig } from '../../src/services/ConfigService';
import { closeDb, initMikroOrm } from '../../src/services/db';

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
            const appId = 100;

            // when sign up for a new account
            const { body: signUpResponse } = await request(app)
                .post('/api/public/signup')
                .send({ appId, email, password })
                .expect(200);        
            // then there is a token in response    
            assert.isNotEmpty(signUpResponse.token);

            // then can sign in with the new account
            const { body: signInResponse } = await request(app)
                .post('/api/public/signin')
                .send({ appId, email, password })
                .expect(200);
            assert.isNotEmpty(signInResponse.token);

            // then the new token can be used for authentication
            const { body: pingResponse } = await request(app)
                .get('/api/ping')       
                .set('Authorization', `Bearer ${signInResponse.token}`)         
                .expect(200);

            assert.equal(pingResponse.appId, appId);
            assert.isTrue(pingResponse.userId > 0);
        });

        it('#it.invalid JWT', async () => {
            const { body: pingResponse } = await request(app)
                .get('/api/ping')       
                .set('Authorization', 'Bearer InvalidJWT')         
                .expect(401);
        });
    });
}); 
