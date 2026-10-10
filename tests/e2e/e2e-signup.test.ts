import { assert } from 'chai';
import { beforeAll, describe, it } from 'bun:test';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

const BASE_URL = process.env.GOAPI_E2E_URL ?? 'http://localhost:8200';

describe('e2e signup account', () => {
    let apiClient: AxiosInstance;

    beforeAll(async () => {
        apiClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });
    });

    it('signs up, creates Personal group, and signs in', async () => {
        const email = `test+${uuid.v4()}@test.com`;
        const password = 'Ab!12345';
        const appId = AppIds.TEST;

        const signUpResponse = await apiClient.post('/api/public/signup', {
            appId,
            email,
            password,
        });
        assert.equal(signUpResponse.status, 200, JSON.stringify(signUpResponse.data));
        assert.isNotEmpty(signUpResponse.data.token);
        assert.equal(signUpResponse.data.appId, appId);
        assert.isAbove(signUpResponse.data.userId, 0);
        assert.isArray(signUpResponse.data.groupIds);
        assert.lengthOf(signUpResponse.data.groupIds, 1);
        assert.isArray(signUpResponse.data.groups);
        assert.lengthOf(signUpResponse.data.groups, 1);
        assert.equal(signUpResponse.data.groups[0].id, signUpResponse.data.groupIds[0]);
        assert.equal(signUpResponse.data.groups[0].name, 'Personal');
        assert.equal(signUpResponse.data.groups[0].role, 'owner');

        const token = signUpResponse.data.token as string;
        const userId = signUpResponse.data.userId as number;

        const groupsResponse = await apiClient.get('/api/groups', {
            headers: {
                Authorization: `Bearer ${token}`,
                appId: `${appId}`,
            },
        });
        assert.equal(groupsResponse.status, 200, JSON.stringify(groupsResponse.data));
        assert.lengthOf(groupsResponse.data.groups, 1);
        assert.deepEqual(groupsResponse.data.groups, signUpResponse.data.groups);

        const signInResponse = await apiClient.post('/api/public/signin', {
            appId,
            email,
            password,
        });
        assert.equal(signInResponse.status, 200, JSON.stringify(signInResponse.data));
        assert.equal(signInResponse.data.userId, userId);
        assert.isNotEmpty(signInResponse.data.token);
    });
});
