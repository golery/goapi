import { app } from '../../src/app';
import request from 'supertest';
import { describe, it, beforeAll, afterAll } from 'bun:test';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { GROUP_ID_HEADER } from '../../src/contants';
import { assert } from 'chai';
import { setupUser, sendRequest } from '../testutils/setup';
import * as uuid from 'uuid';

/** Delta download: keyset pages over (updatedAt, id), no skips, no repeats. */

describe('router/record-delta', () => {
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
            request(app).post('/api/groups').send({ name: 'Delta shop' }),
        );
        return { user, groupId: created.group.id };
    }

    async function putRecords(
        user: { token: string; appId: number },
        groupId: number,
        records: Record<string, unknown[]>,
    ) {
        return sendRequest<{ records: Record<string, any[]>; timestamp: number }>(
            user,
            authed(user, groupId, request(app).put('/api/record/sync')).send({ records }),
        );
    }

    async function getDelta(
        user: { token: string; appId: number },
        groupId: number,
        query: string,
        status = 200,
    ) {
        const res = await authed(user, groupId, request(app).get(`/api/record/delta${query}`))
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

    it('pages products with the after cursor and never repeats', async () => {
        const { user, groupId } = await setupGroup();
        // Record ids are uuid columns, so the test uses real uuids.
        const [p1, p2, p3] = [uuid.v4(), uuid.v4(), uuid.v4()];
        await putRecords(user, groupId, {
            products: [
                product(p1, 'A', 1000),
                product(p2, 'B', 1000),
                product(p3, 'C', 2000),
            ],
        });

        const seen: string[] = [];
        let after: string | undefined;
        let hasMore = true;
        let rounds = 0;
        let serverTimestamp = 0;
        while (hasMore) {
            const afterParam = after === undefined ? '' : `&after=${after}`;
            const page = await getDelta(user, groupId, `?table=products&since=0&limit=2${afterParam}`);
            serverTimestamp = page.serverTimestamp;
            for (const row of page.records) {
                assert.notInclude(seen, row.id);
                seen.push(row.id);
            }
            if (page.records.length > 0) {
                after = page.records[page.records.length - 1].id;
            }
            hasMore = page.hasMore;
            rounds += 1;
            assert.isBelow(rounds, 10, 'paging must terminate');
        }

        assert.sameMembers(seen, [p1, p2, p3]);
        assert.isAbove(serverTimestamp, 0);
    });

    it('returns an empty page with hasMore false past the end', async () => {
        const { user, groupId } = await setupGroup();
        await putRecords(user, groupId, { products: [product(uuid.v4(), 'Q', 1000)] });

        const page = await getDelta(user, groupId, '?table=products&since=9999999999999&limit=200');
        assert.deepEqual(page.records, []);
        assert.isFalse(page.hasMore);
        assert.isAbove(page.serverTimestamp, 0);
    });

    it('explodes order lines and tags contacts with a role', async () => {
        const { user, groupId } = await setupGroup();
        const [o1, s1, c1] = [uuid.v4(), uuid.v4(), uuid.v4()];
        await putRecords(user, groupId, {
            orders: [{
                id: o1, kind: 'sale', number: 'S-1', status: 'open',
                updateTime: 3000, createTime: 3000, deleted: false,
                lines: [
                    { id: 'l1', productId: 'p1', quantity: 2, fulfilled: 0 },
                    { id: 'l2', productId: 'p1', quantity: 1, fulfilled: 0 },
                ],
            }],
            suppliers: [{ id: s1, name: 'Sup', updateTime: 3000, createTime: 3000, deleted: false }],
            customers: [{ id: c1, name: 'Cus', updateTime: 3000, createTime: 3000, deleted: false }],
        });

        const lines = await getDelta(user, groupId, '?table=order_lines&since=0&limit=200');
        assert.isFalse(lines.hasMore);
        assert.lengthOf(lines.records, 2);
        assert.deepEqual(
            lines.records.map((r) => r.line.id).sort(),
            ['l1', 'l2'],
        );
        for (const row of lines.records) {
            assert.equal(row.orderId, o1);
            assert.equal(row.id, o1);
        }

        const contacts = await getDelta(user, groupId, '?table=contacts&since=0&limit=200');
        const roles = Object.fromEntries(contacts.records.map((r) => [r.id, r.role]));
        assert.deepEqual(roles, { [s1]: 'supplier', [c1]: 'customer' });
    });

    it('carries tombstones with deleted set', async () => {
        const { user, groupId } = await setupGroup();
        const t1 = uuid.v4();
        await putRecords(user, groupId, {
            products: [{ ...product(t1, 'Gone', 4000), deleted: true }],
        });

        const page = await getDelta(user, groupId, '?table=products&since=0&limit=200');
        assert.lengthOf(page.records, 1);
        assert.isTrue(page.records[0].deleted);
        assert.equal(page.records[0].id, t1);
    });

    it('rejects unknown tables and missing groups', async () => {
        const { user, groupId } = await setupGroup();
        await getDelta(user, groupId, '?table=nope&since=0&limit=200', 400);
        await authed(user, 0, request(app).get('/api/record/delta?table=products&since=0')).expect(400);
    });
});
