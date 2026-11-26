import { app } from '../../src/app';
import request from 'supertest';
import { describe, it, beforeAll, afterAll } from 'bun:test';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { GROUP_ID_HEADER } from '../../src/contants';
import { assert } from 'chai';
import { setupUser, sendRequest } from '../testutils/setup';
import * as uuid from 'uuid';

/** Commit endpoint: bulk blind upsert of phone tables, read back via delta. */

describe('router/record-commit', () => {
    beforeAll(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    afterAll(async () => {
        await closeDb();
    });

    function authed(user: { token: string; appId: number }, groupId: number, req: any) {
        return req
            .set('Authorization', `Bearer ${user.token}`)
            .set('appId', `${user.appId}`)
            .set(GROUP_ID_HEADER, `${groupId}`);
    }

    async function setupGroup() {
        const user = await setupUser();
        const created = await sendRequest<{ group: { id: number } }>(
            user,
            request(app).post('/api/groups').send({ name: 'Commit shop' }),
        );
        return { user, groupId: created.group.id };
    }

    async function commit(
        user: { token: string; appId: number },
        groupId: number,
        records: Record<string, unknown[]>,
        status = 200,
    ) {
        const res = await authed(user, groupId, request(app).put('/api/records'))
            .send({ records })
            .expect(status);
        return res.body as { accepted: Record<string, number>; timestamp: number };
    }

    async function getDelta(
        user: { token: string; appId: number },
        groupId: number,
        query: string,
        status = 200,
    ) {
        const res = await authed(user, groupId, request(app).get(`/api/records/delta${query}`))
            .expect(status);
        return res.body as { records: any[]; serverTimestamp: number; hasMore: boolean };
    }

    function product(id: string, name: string, updateTime: number) {
        return {
            id, name, tags: [], images: [], fieldIds: [],
            fields: {}, updateTime, createTime: updateTime,
            sample: false, deleted: false,
        };
    }

    it('commits bulk tables and reports per-table counts', async () => {
        const { user, groupId } = await setupGroup();
        const [p1, s1] = [uuid.v4(), uuid.v4()];
        const body = await commit(user, groupId, {
            products: [product(p1, 'A', 1000)],
            suppliers: [{ id: s1, name: 'Sup', updateTime: 1000, createTime: 1000, deleted: false }],
            customers: [],
        });

        assert.deepEqual(body.accepted, { products: 1, suppliers: 1, customers: 0 });
        assert.isAbove(body.timestamp, 0);

        const products = await getDelta(user, groupId, '?table=products&since=0&limit=200');
        assert.lengthOf(products.records, 1);
        assert.equal(products.records[0].name, 'A');

        const contacts = await getDelta(user, groupId, '?table=contacts&since=0&limit=200');
        assert.lengthOf(contacts.records, 1);
        assert.equal(contacts.records[0].role, 'supplier');
    });

    it('stores plain-string ids such as built-in custom field ids', async () => {
        const { user, groupId } = await setupGroup();
        await commit(user, groupId, {
            customFields: [{
                id: 'expiry-date', name: 'Expiry date', type: 'DATE',
                allProducts: true, standard: true, options: null, order: -40,
                updateTime: 1000, createTime: 1000,
            }],
        });

        const page = await getDelta(user, groupId, '?table=field_defs&since=0&limit=200');
        assert.lengthOf(page.records, 1);
        assert.equal(page.records[0].id, 'expiry-date');
    });

    it('blind upserts: the phone always wins, even with an older updateTime', async () => {
        const { user, groupId } = await setupGroup();
        const id = uuid.v4();
        await commit(user, groupId, { products: [product(id, 'New', 5000)] });
        await commit(user, groupId, { products: [product(id, 'Stale', 1000)] });

        const page = await getDelta(user, groupId, '?table=products&since=0&limit=200');
        assert.lengthOf(page.records, 1);
        assert.equal(page.records[0].name, 'Stale');
    });

    it('generates an id when the row has none and keeps tombstones', async () => {
        const { user, groupId } = await setupGroup();
        const t1 = uuid.v4();
        const body = await commit(user, groupId, {
            products: [
                { name: 'No id', updateTime: 1000, createTime: 1000, deleted: false },
                { ...product(t1, 'Gone', 2000), deleted: true },
            ],
        });
        assert.deepEqual(body.accepted, { products: 2 });

        const page = await getDelta(user, groupId, '?table=products&since=0&limit=200');
        assert.lengthOf(page.records, 2);
        const byId = Object.fromEntries(page.records.map((r) => [r.id, r]));
        assert.isTrue(byId[t1].deleted);
        const generated = page.records.find((r) => r.id !== t1);
        assert.isString(generated.id);
        assert.isNotEmpty(generated.id);
        assert.equal(generated.name, 'No id');
    });

    it('rejects unknown tables, non-array tables, and missing groups', async () => {
        const { user, groupId } = await setupGroup();
        await commit(user, groupId, { nope: [] }, 400);
        await commit(user, groupId, { products: 'oops' as any }, 400);
        await authed(user, groupId, request(app).put('/api/records'))
            .send({})
            .expect(400);
        await authed(user, 0, request(app).put('/api/records'))
            .send({ records: { products: [] } })
            .expect(400);
    });
});
