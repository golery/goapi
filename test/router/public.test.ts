import { assert } from 'chai';
import { describe } from 'mocha';
import request from 'supertest';
import * as uuid from 'uuid';
import { app } from '../../src/app';
import { loadConfig } from '../../src/services/ConfigService';
import { closeDb, initMikroOrm } from '../../src/services/db';
import sinon from 'sinon';
import * as google from '../../src/external/google';
import { AppIds, GOOGLE_SIGN_IN_CLIENT_ID } from '../../src/contants';

describe('router/public', function () {
    before(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    after(async () => {
        console.log('DONE');
        await closeDb();
    });
    this.afterEach(() => {
        sinon.restore();
    })

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

        it('#it.signUp with password then signIn with Google', async () => {
            const email = `test+${uuid.v4()}@test.com`;
            const password = uuid.v4();
            const appId = AppIds.TEST;

            sinon.stub(google, 'getTokenInfo').resolves({ aud: GOOGLE_SIGN_IN_CLIENT_ID[`${AppIds.TEST}`][0], email, email_verified: true, expires_in: 60 });
            // Given account was signed up with password
            const { body: signUpWithPassword } = await request(app)
                .post('/api/public/signup')
                .send({ appId, email, password })
                .expect(200);

            // Then user sign in with google
            const accessToken = `accessToken-${uuid.v4()}`;
            const { body: signUpWithGoogle } = await request(app)
                .post('/api/public/signInGoogle')
                .send({ appId, accessToken })
                .expect(200);
            assert.equal(signUpWithPassword.userId, signUpWithGoogle.userId);

            // Then user should still be able to login with previous password
            const { body: signUpWithPasswordAgain } = await request(app)
                .post('/api/public/signin')
                .send({ appId, email, password })
                .expect(200);
            assert.equal(signUpWithPasswordAgain.userId, signUpWithPassword.userId);
        });

        it('#it.signIn with Google then sign up with password', async () => {
            const email = `test+${uuid.v4()}@test.com`;
            const password = uuid.v4();
            const appId = AppIds.TEST;

            sinon.stub(google, 'getTokenInfo').resolves({ aud: GOOGLE_SIGN_IN_CLIENT_ID[`${AppIds.TEST}`][0], email, email_verified: true, expires_in: 60 });

            // Given user sign in with google
            const accessToken = `accessToken-${uuid.v4()}`;
            const { body: signUpWithGoogle } = await request(app)
                .post('/api/public/signInGoogle')
                .send({ appId, accessToken })
                .expect(200);
            let userId = signUpWithGoogle.userId;

            // Then sign up with password for the same email
            const { body: signUpWithPassword } = await request(app)
                .post('/api/public/signup')
                .send({ appId, email, password })
                .expect(200);

            // Then user should still be able to login with password
            const { body: signInWithPassword } = await request(app)
                .post('/api/public/signin')
                .send({ appId, email, password })
                .expect(200);
            assert.equal(signInWithPassword.userId, userId);

            // Then user should still be able to login with password
            const { body: signInWithGoogleAgain } = await request(app)
                .post('/api/public/signInGoogle')
                .send({ appId, accessToken })
                .expect(200);
            assert.equal(signInWithGoogleAgain.userId, userId);
        });
    });

    it('#it.signup account for two different appIds', async () => {
        const email = `test+${uuid.v4()}@test.com`;
        const password1 = uuid.v4();
        const appId1 = AppIds.TEST;

        const password2 = uuid.v4();
        const appId2 = AppIds.TEST2;

        // Given user sign up with two appIds
        const { body: response1 } = await request(app)
            .post('/api/public/signup')
            .send({ appId: appId1, email, password: password1 })
            .expect(200);

        const { body: response2 } = await request(app)
            .post('/api/public/signup')
            .send({ appId: appId2, email, password: password2 })
            .expect(200);

        assert.isTrue(response1.userId !== response2.userId);

        // Then user should be able to login on both account
        const { body: response3 } = await request(app)
            .post('/api/public/signin')
            .send({ appId: appId1, email, password: password1 })
            .expect(200);
        const { body: response4 } = await request(app)
            .post('/api/public/signin').send({ appId: appId2, email, password: password2 })
            .expect(200);
        assert.equal(response1.userId, response3.userId);
        assert.equal(response2.userId, response4.userId);
    });
});