import { Test } from 'supertest';
import { User } from '../../src/entity/User.entity';
import { createAccessToken } from '../../src/services/AccountService';
import { orm } from '../../src/services/db';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

export interface TestUser {
    token: string,
    appId: number,
    userId: number,
}

export async function setupUser(): Promise<TestUser> {
    const em = orm.em.fork();
    const user = new User();
    Object.assign(user, {
        email: `test+${uuid.v4()}@test.com`,
        password: `pass-${uuid.v4()}}`,
        passwordHash: `pass-${uuid.v4()}}`,
        appId: AppIds.TEST
    });
    await em.persistAndFlush(user);
    return { userId: user.id, appId: AppIds.TEST, token: createAccessToken(user) };
}

export async function sendRequest<T>(user: TestUser, request: Test): Promise<T> {
    const result = await request.set('Authorization', `Bearer ${user.token}`)
    .set('appId', `${user.appId}`)
    .expect(200);
    return result.body;
}

