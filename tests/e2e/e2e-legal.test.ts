import { assert } from 'chai';
import { beforeAll, describe, it } from 'bun:test';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

const BASE_URL = process.env.GOAPI_E2E_URL ?? 'http://localhost:8200';

const legalPayload = {
    terms: 'https://example.com/terms',
    privacy: 'https://example.com/privacy',
};

describe('e2e legal acceptance', () => {
    let apiClient: AxiosInstance;

    beforeAll(async () => {
        apiClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });
    });

    async function signUp(): Promise<{ token: string; userId: number; appId: number }> {
        const email = `test+${uuid.v4()}@test.com`;
        const password = 'Ab!12345';
        const appId = AppIds.TEST;
        const signUpResponse = await apiClient.post('/api/public/signup', {
            appId,
            email,
            password,
        });
        assert.equal(signUpResponse.status, 200, `signup failed: ${signUpResponse.status}`);
        assert.isNotEmpty(signUpResponse.data.token);
        return {
            token: signUpResponse.data.token,
            userId: signUpResponse.data.userId,
            appId: signUpResponse.data.appId,
        };
    }

    it('records terms and privacy acceptance for the signed-in user', async () => {
        const { token, userId, appId } = await signUp();

        const response = await apiClient.post('/api/legal/accept', legalPayload, {
            headers: {
                Authorization: `Bearer ${token}`,
                appId: `${appId}`,
                'X-Forwarded-For': '203.0.113.10, 10.0.0.1',
            },
        });

        assert.equal(response.status, 200, JSON.stringify(response.data));
        assert.isNumber(response.data.id);
        assert.equal(response.data.userId, userId);
        assert.equal(response.data.appId, appId);
        assert.equal(response.data.terms, legalPayload.terms);
        assert.equal(response.data.privacy, legalPayload.privacy);
        assert.equal(response.data.ipAddress, '203.0.113.10');
        assert.isString(response.data.acceptedAt);
    });

    it('rejects acceptance without document urls', async () => {
        const { token, appId } = await signUp();
        const response = await apiClient.post('/api/legal/accept', {}, {
            headers: {
                Authorization: `Bearer ${token}`,
                appId: `${appId}`,
            },
        });
        assert.equal(response.status, 400);
    });

    it('requires authentication', async () => {
        const response = await apiClient.post('/api/legal/accept', legalPayload);
        assert.equal(response.status, 401);
    });
});
