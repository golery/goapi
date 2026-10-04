import { app } from '../../src/app';
import request from 'supertest';
import { describe, it, beforeAll, afterAll } from 'bun:test';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { assert } from 'chai';
import { sendRequest, setupUser } from '../testutils/setup';
import { getEm } from '../../src/services/db';
import { User } from '../../src/entity/User.entity';
import { createAccessToken } from '../../src/services/AccountService';
import { AppIds } from '../../src/contants';
import * as uuid from 'uuid';

/** Requires migrations/multi_user_groups.sql applied on the test database. */

describe('router/groups', () => {
    beforeAll(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    afterAll(async () => {
        await closeDb();
    });

    async function setupSecondUser(): Promise<{ token: string; appId: number; userId: number }> {
        const em = getEm();
        const user = new User();
        user.email = `test+${uuid.v4()}@other.example`;
        user.passwordHash = 'x';
        user.appId = AppIds.TEST;
        await em.persistAndFlush(user);
        return { userId: user.id, appId: AppIds.TEST, token: createAccessToken(user) };
    }

    it('creates a group and lists it as owner', async () => {
        const testUser = await setupUser();
        const created = await sendRequest<{ group: { id: number; name: string; role: string } }>(
            testUser,
            request(app).post('/api/groups').send({ name: 'Shop' }),
        );
        assert.equal(created.group.role, 'owner');
        assert.equal(created.group.name, 'Shop');

        const listed = await sendRequest<{ groups: { id: number; name: string; role: string }[] }>(
            testUser,
            request(app).get('/api/groups'),
        );
        assert.deepEqual(listed.groups.map((g) => g.id), [created.group.id]);
        assert.equal(listed.groups[0].role, 'owner');
    });

    it('invite, join, and reject reuse of code', async () => {
        const owner = await setupUser();
        const created = await sendRequest<{ group: { id: number } }>(
            owner,
            request(app).post('/api/groups').send({ name: 'Shared' }),
        );
        const groupId = created.group.id;

        const invite = await sendRequest<{ code: string }>(
            owner,
            request(app).post(`/api/groups/${groupId}/invites`),
        );
        assert.isString(invite.code);

        const peopleOwner = await sendRequest<{ invites?: { code: string }[] }>(
            owner,
            request(app).get(`/api/groups/${groupId}/people`),
        );
        assert.isArray(peopleOwner.invites);
        assert.equal(peopleOwner.invites![0].code, invite.code);

        const joiner = await setupSecondUser();
        await sendRequest(
            joiner,
            request(app).post('/api/groups/join').send({ code: invite.code }),
        );

        await request(app)
            .post('/api/groups/join')
            .set('Authorization', `Bearer ${joiner.token}`)
            .set('appId', `${joiner.appId}`)
            .send({ code: invite.code })
            .expect(409);

        const peopleStaff = await sendRequest<Record<string, unknown>>(
            joiner,
            request(app).get(`/api/groups/${groupId}/people`),
        );
        assert.isUndefined(peopleStaff.invites);
    });

    it('staff cannot rename; last owner cannot leave', async () => {
        const owner = await setupUser();
        const created = await sendRequest<{ group: { id: number } }>(
            owner,
            request(app).post('/api/groups').send({ name: 'Solo' }),
        );
        const groupId = created.group.id;

        const invite = await sendRequest<{ code: string }>(
            owner,
            request(app).post(`/api/groups/${groupId}/invites`),
        );
        const staff = await setupSecondUser();
        await sendRequest(staff, request(app).post('/api/groups/join').send({ code: invite.code }));

        await request(app)
            .patch(`/api/groups/${groupId}`)
            .set('Authorization', `Bearer ${staff.token}`)
            .set('appId', `${staff.appId}`)
            .send({ name: 'Nope' })
            .expect(403);

        await request(app)
            .delete(`/api/groups/${groupId}/members/${owner.userId}`)
            .set('Authorization', `Bearer ${owner.token}`)
            .set('appId', `${owner.appId}`)
            .expect(409);
    });
});
