import { request } from 'supertest';
import { User } from '../../src/entity/User.entity';
import { createAccessToken } from '../../src/services/AccountService';
import { orm } from '../../src/services/db';
import * as uuid from 'uuid';

export const testAppId = 100;
export async function createUser(): Promise<{ accessToken: string; user: User; }> {
    const em = orm.em.fork();
    const user = new User();
    Object.assign(user, {
        email: `test+${uuid.v4()}@test.com`,
        password: `pass-${uuid.v4()}}`,
        passwordHash: `pass-${uuid.v4()}}`,
        appId: testAppId
    });
    await em.persistAndFlush(user);
    return { user, accessToken: createAccessToken(user) };
}

export async function sendRequest<T>(accessToken: string, request: request.Test): Promise<T> {
    const result = await request.set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
    return result.body;
}

