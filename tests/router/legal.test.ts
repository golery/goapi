import http from 'http';
import { app } from '../../src/app';
import { describe, it, beforeAll, afterAll } from 'bun:test';
import { closeDb, getEm, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { assert } from 'chai';
import { setupUser, TestUser } from '../testutils/setup';
import { LegalAcceptance } from '../../src/entity/LegalAcceptance.entity';

/** Requires migrations/legal_acceptance.sql applied on the test database. */

describe('router/legal', () => {
    let server: http.Server;
    let base: string;

    beforeAll(async () => {
        await loadConfig();
        await initMikroOrm();
        server = http.createServer(app);
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
            throw new Error('Test server did not bind a port');
        }
        base = `http://127.0.0.1:${addr.port}`;
    });
    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        await closeDb();
    });

    async function postAccept(user: TestUser | undefined, body: unknown, headers: Record<string, string> = {}) {
        const response = await fetch(`${base}/api/legal/accept`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(user ? { authorization: `Bearer ${user.token}` } : {}),
                ...headers,
            },
            body: JSON.stringify(body),
        });
        const text = await response.text();
        let json: unknown = text;
        try {
            json = JSON.parse(text);
        } catch {
            // auth failures are plain text
        }
        return { status: response.status, body: json };
    }

    it('records acceptance with user, app id, urls, and ip', async () => {
        const testUser = await setupUser();
        const payload = {
            terms: 'https://example.com/terms',
            privacy: 'https://example.com/privacy',
        };
        const saved = await postAccept(testUser, payload, {
            'x-forwarded-for': '203.0.113.10, 10.0.0.1',
            appId: `${testUser.appId}`,
        });

        assert.equal(saved.status, 200);
        const body = saved.body as {
            id: number;
            userId: number;
            appId: number;
            terms: string;
            privacy: string;
            ipAddress: string;
            acceptedAt: string;
        };
        assert.equal(body.userId, testUser.userId);
        assert.equal(body.appId, testUser.appId);
        assert.equal(body.terms, payload.terms);
        assert.equal(body.privacy, payload.privacy);
        assert.equal(body.ipAddress, '203.0.113.10');
        assert.isString(body.acceptedAt);

        const row = await getEm().fork().findOne(LegalAcceptance, { id: body.id });
        assert.equal(row?.userId, testUser.userId);
        assert.equal(row?.appId, testUser.appId);
        assert.equal(row?.ipAddress, '203.0.113.10');
        await getEm().fork().nativeDelete(LegalAcceptance, { id: body.id });
    });

    it('rejects a body without document urls', async () => {
        const testUser = await setupUser();
        const saved = await postAccept(testUser, {}, { appId: `${testUser.appId}` });
        assert.equal(saved.status, 400);
    });

    it('requires authentication', async () => {
        const saved = await postAccept(undefined, {
            terms: 'https://example.com/terms',
            privacy: 'https://example.com/privacy',
        });
        assert.equal(saved.status, 401);
    });
});
