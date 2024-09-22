import { app } from '../../src/app';
import request from 'supertest';
import { describe } from 'mocha';
import { closeDb, initMikroOrm } from '../../src/services/db';
import { loadConfig } from '../../src/services/ConfigService';
import { APP_ID_HEADER, AppIds, GROUP_ID_HEADER } from '../../src/contants';
import * as uuid from 'uuid';
import { assert } from 'chai';
import { getTestEm, sendRequest, setupUser } from '../testutils/setup';
import * as _ from 'lodash';
import { getRandomInt } from '../testutils/random';
import { CreateGroupResponse, GetUserResponse, UploadFileResponse } from '../../src/types/schemas';
import * as fs from 'fs'
import * as path from 'path'
import { File } from '../../src/entity/File.entity';

describe('router/authenticated', () => {
    before(async () => {
        await loadConfig();
        await initMikroOrm();
    });
    after(async () => {
        await closeDb();
    });
    describe('record', () => {
        it('#sync', async () => {
            const testUser = await setupUser();
            const random = uuid.v4();
            const response: any = await sendRequest(testUser, request(app)
                .put('/api/record/sync')
                .set(GROUP_ID_HEADER, `${getRandomInt()}`)
                .send({ records: { test: [{ random }] } }));
            console.log(response.records.test);
            const saved = response.records.test.find(o => o.random === random);
            assert.deepEqual(_.pick(saved, ['random']), { random });
        });
    });

    describe('group', () => {
        it('#it.create group then get user info', async () => {
            const testUser = await setupUser();
            // Given a user create a group
            const group: CreateGroupResponse = await sendRequest(testUser, request(app)
                .post('/api/group')
            );
            assert.equal(group.appId, AppIds.TEST);

            // Then that group is associated with the user 
            const userInfo: GetUserResponse = await sendRequest(testUser, request(app)
                .get('/api/user'));
            assert.deepEqual(userInfo.groupIds, [group.id]);
        });
    });

    describe('#file', () => {
        it('#it.upload then download', async () => {
            const filePath = path.join(__dirname, '../testdata', 'sample.png');
            const buffer = fs.readFileSync(filePath);
            const testUser = await setupUser();
            const { key }: UploadFileResponse = await sendRequest(testUser, request(app)
                .post('/api/file/stocky')
                .set('Content-Type', 'image/png')
                .send(buffer));            
            assert.isTrue(key.startsWith('stocky.'));;

            const downnloadResponse: Buffer = (await request(app)
                .get(`/api/public/file/${key}`).expect(200)).body;
            assert.equal(downnloadResponse.length, buffer.length);

            const file = await (await getTestEm()).findOneOrFail(File, { key });
            assert.equal(file.userId, testUser.userId);
            assert.equal(file.appId, testUser.appId);
            assert.equal(file.size, buffer.length);
        });

        it('#it.download not found', async () => {                
            await request(app).get(`/api/public/file/invalid-key`).expect(404);
        });
    }); 
});
