import { assert } from 'chai';
import { beforeAll, describe, it } from 'bun:test';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

/** Requires migrations/multi_user_groups.sql applied on the e2e database. */

const BASE_URL = process.env.GOAPI_E2E_URL ?? 'http://localhost:8200';

type AuthSession = { token: string; userId: number; appId: number };

describe('e2e group invite', () => {
    let apiClient: AxiosInstance;

    beforeAll(async () => {
        apiClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true,
        });
    });

    async function signUp(): Promise<AuthSession> {
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

    function authHeaders(session: AuthSession) {
        return {
            Authorization: `Bearer ${session.token}`,
            appId: `${session.appId}`,
        };
    }

    it('invite, join, and reject reuse of code', async () => {
        const owner = await signUp();
        const createGroupResponse = await apiClient.post(
            '/api/groups',
            { name: 'Shared' },
            { headers: authHeaders(owner) },
        );
        assert.equal(createGroupResponse.status, 200, JSON.stringify(createGroupResponse.data));
        const groupId = createGroupResponse.data.group.id as number;
        assert.equal(createGroupResponse.data.group.role, 'owner');

        const inviteResponse = await apiClient.post(`/api/groups/${groupId}/invites`, null, {
            headers: authHeaders(owner),
        });
        assert.equal(inviteResponse.status, 200, JSON.stringify(inviteResponse.data));
        const code = inviteResponse.data.code as string;
        assert.isString(code);
        assert.equal(inviteResponse.data.role, 'staff');
        assert.isString(inviteResponse.data.expiresAt);

        const peopleOwnerResponse = await apiClient.get(`/api/groups/${groupId}/people`, {
            headers: authHeaders(owner),
        });
        assert.equal(peopleOwnerResponse.status, 200, JSON.stringify(peopleOwnerResponse.data));
        assert.isArray(peopleOwnerResponse.data.invites);
        assert.equal(peopleOwnerResponse.data.invites[0].code, code);

        const joiner = await signUp();
        const joinResponse = await apiClient.post(
            '/api/groups/join',
            { code },
            { headers: authHeaders(joiner) },
        );
        assert.equal(joinResponse.status, 200, JSON.stringify(joinResponse.data));
        assert.equal(joinResponse.data.group.id, groupId);
        assert.equal(joinResponse.data.group.role, 'staff');
        assert.equal(joinResponse.data.membership.role, 'staff');

        const reuseResponse = await apiClient.post(
            '/api/groups/join',
            { code },
            { headers: authHeaders(joiner) },
        );
        assert.equal(reuseResponse.status, 409, JSON.stringify(reuseResponse.data));

        const peopleStaffResponse = await apiClient.get(`/api/groups/${groupId}/people`, {
            headers: authHeaders(joiner),
        });
        assert.equal(peopleStaffResponse.status, 200, JSON.stringify(peopleStaffResponse.data));
        assert.isUndefined(peopleStaffResponse.data.invites);
        assert.isArray(peopleStaffResponse.data.members);
        const joinerMember = peopleStaffResponse.data.members.find(
            (m: { userId: number }) => m.userId === joiner.userId,
        );
        assert.isObject(joinerMember);
        assert.equal(joinerMember.role, 'staff');

        const listResponse = await apiClient.get('/api/groups', { headers: authHeaders(joiner) });
        assert.equal(listResponse.status, 200, JSON.stringify(listResponse.data));
        const listed = listResponse.data.groups.find((g: { id: number }) => g.id === groupId);
        assert.isObject(listed);
        assert.equal(listed.role, 'staff');
    });

    it('owner can revoke an invite before it is used', async () => {
        const owner = await signUp();
        const createGroupResponse = await apiClient.post(
            '/api/groups',
            { name: 'Revoke test' },
            { headers: authHeaders(owner) },
        );
        assert.equal(createGroupResponse.status, 200, JSON.stringify(createGroupResponse.data));
        const groupId = createGroupResponse.data.group.id as number;

        const inviteResponse = await apiClient.post(`/api/groups/${groupId}/invites`, null, {
            headers: authHeaders(owner),
        });
        assert.equal(inviteResponse.status, 200, JSON.stringify(inviteResponse.data));
        const code = inviteResponse.data.code as string;

        const revokeResponse = await apiClient.delete(`/api/groups/${groupId}/invites/${code}`, {
            headers: authHeaders(owner),
        });
        assert.equal(revokeResponse.status, 200, JSON.stringify(revokeResponse.data));

        const joiner = await signUp();
        const joinResponse = await apiClient.post(
            '/api/groups/join',
            { code },
            { headers: authHeaders(joiner) },
        );
        assert.equal(joinResponse.status, 409, JSON.stringify(joinResponse.data));
    });

    it('requires authentication to create or use invites', async () => {
        const owner = await signUp();
        const createGroupResponse = await apiClient.post(
            '/api/groups',
            { name: 'Auth test' },
            { headers: authHeaders(owner) },
        );
        const groupId = createGroupResponse.data.group.id as number;

        const unauthInvite = await apiClient.post(`/api/groups/${groupId}/invites`);
        assert.equal(unauthInvite.status, 401);

        const unauthJoin = await apiClient.post('/api/groups/join', { code: 'ABCDEF' });
        assert.equal(unauthJoin.status, 401);
    });
});
