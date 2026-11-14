import { assert } from 'chai';
import { beforeAll, describe, it } from 'bun:test';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

const BASE_URL = process.env.GOAPI_E2E_URL ?? 'http://localhost:8200';

describe('e2e stock operations', () => {
    let apiClient: AxiosInstance;

    beforeAll(async () => {
        apiClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });
    });

    async function signUp(): Promise<{ token: string; appId: number; groupId: number }> {
        const email = `test+${uuid.v4()}@test.com`;
        const signUpResponse = await apiClient.post('/api/public/signup', {
            appId: AppIds.TEST,
            email,
            password: 'Ab!12345',
        });
        assert.equal(signUpResponse.status, 200, JSON.stringify(signUpResponse.data));
        return {
            token: signUpResponse.data.token,
            appId: signUpResponse.data.appId,
            groupId: signUpResponse.data.groupIds[0],
        };
    }

    function headers(token: string, appId: number, groupId: number) {
        return {
            Authorization: `Bearer ${token}`,
            appId: `${appId}`,
            groupId: `${groupId}`,
        };
    }

    function receive(quantity: number, deviceSeq: number, baseSeq: number) {
        return {
            deviceId: uuid.v4(),
            deviceSeq,
            baseSeq,
            deviceNow: Date.now(),
            op: {
                opId: uuid.v4(),
                v: 1,
                type: 'receive',
                at: Date.now(),
                productId: 'ball',
                storageId: 'main',
                quantity,
            },
        };
    }

    it('keeps two receives and adds both quantities', async () => {
        const { token, appId, groupId } = await signUp();
        const auth = headers(token, appId, groupId);
        const deviceId = uuid.v4();
        const first = receive(4, 1, 0);
        first.deviceId = deviceId;
        const second = receive(5, 2, 1);
        second.deviceId = deviceId;

        const phoneB = await apiClient.post('/api/stock/ops', first, { headers: auth });
        assert.equal(phoneB.status, 200, JSON.stringify(phoneB.data));
        assert.equal(phoneB.data.onHand[0].quantity, 4);
        assert.equal(phoneB.data.seq, 1);

        const phoneA = await apiClient.post('/api/stock/ops', second, { headers: auth });
        assert.equal(phoneA.status, 200, JSON.stringify(phoneA.data));
        assert.equal(phoneA.data.onHand[0].quantity, 9);

        const retry = await apiClient.post('/api/stock/ops', second, { headers: auth });
        assert.equal(retry.status, 200, JSON.stringify(retry.data));
        assert.equal(retry.data.seq, phoneA.data.seq);
        assert.equal(retry.data.onHand[0].quantity, 9);

        const gap = receive(1, 4, 2);
        gap.deviceId = deviceId;
        const skipped = await apiClient.post('/api/stock/ops', gap, { headers: auth });
        assert.equal(skipped.status, 409, JSON.stringify(skipped.data));
        assert.equal(skipped.data.data.expectedDeviceSeq, 3);

        const pulled = await apiClient.get('/api/stock/ops?after=0', { headers: auth });
        assert.equal(pulled.status, 200, JSON.stringify(pulled.data));
        assert.equal(pulled.data.ops.length, 2);
        assert.equal(pulled.data.ops[1].onHand[0].quantity, 9);
    }, 60000);

    it('requires a member of the group', async () => {
        const { token, appId } = await signUp();
        const response = await apiClient.post('/api/stock/ops', receive(1, 1, 0), {
            headers: headers(token, appId, 99999999),
        });
        assert.equal(response.status, 404);
    }, 60000);
});
