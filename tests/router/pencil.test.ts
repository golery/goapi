import { app } from '../../src/app';
import request from 'supertest';
import { describe, it, beforeAll, afterAll } from 'bun:test';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { assert } from 'chai';
import { sendRequest, setupUser } from '../testutils/setup';
import * as _ from 'lodash';

describe('router/pencil', () => {
    beforeAll(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    afterAll(async () => {
        await closeDb();
    });

    describe('GET /pencil/book', () => {
        it('should ping', async () => {
            const response = await request(app).get('/').expect(200);
            assert.equal(response.text, 'ping');
        });

        it('should initialize default book for new user', async () => {
            const testUser = await setupUser();

            // First call - should initialize default book
            const response = await sendRequest(testUser, request(app)
                .get('/api/pencil/book'));

            assert.isArray(response);
            assert.lengthOf(response, 1);
            assert.equal(response[0].name, 'My Space');
            assert.equal(response[0].code, 'personal');
            assert.equal(response[0].userId, testUser.userId.toString());

            // Second call - should return existing book
            const response2 = await sendRequest(testUser, request(app)
                .get('/api/pencil/book'));

            assert.isArray(response2);
            assert.lengthOf(response2, 1);
            assert.equal(response2[0].id, response[0].id);
        });
    });
});
