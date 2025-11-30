import { assert } from 'chai';
import { describe } from 'mocha';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';

const BASE_URL = 'http://localhost:8200';

describe('e2e node', function () {
    let authToken: string;
    let createdNodeId: number;
    let apiClient: AxiosInstance;

    before(async () => {
        // Create axios instance for making requests to the real server
        apiClient = axios.create({
            baseURL: BASE_URL,
            validateStatus: () => true, // Don't throw on any status code
        });
    });

    it('should create a new node and update it with tags', async () => {
        const email = `test+${uuid.v4()}@test.com`;
        const password = 'Ab!12345';
        const appId = AppIds.TEST;

        // Step 1: Sign up to get authentication token
        const signUpResponse = await apiClient.post('/api/public/signup', {
            appId,
            email,
            password,
        });
        
        assert.equal(signUpResponse.status, 200, `Expected status 200, got ${signUpResponse.status}`);
        assert.isNotEmpty(signUpResponse.data.token);
        authToken = signUpResponse.data.token;

        // Step 2: Create a book (which creates a root node)
        const bookName = `Test Book ${uuid.v4()}`;
        const bookCode = `test-book-${uuid.v4()}`;
        
        const createBookResponse = await apiClient.post(
            '/api/pencil/book',
            { name: bookName, code: bookCode },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    appId: `${appId}`,
                },
            }
        );

        assert.equal(createBookResponse.status, 200, `Expected status 200, got ${createBookResponse.status}`);
        assert.isObject(createBookResponse.data);
        assert.isObject(createBookResponse.data.node);
        assert.isNumber(createBookResponse.data.node.id);
        createdNodeId = createBookResponse.data.node.id;

        // Step 3: Update the node with tags
        const tags = ['tag1', 'tag2', 'tag3'];
        const updateNodeResponse = await apiClient.post(
            '/api/pencil/update',
            {
                id: createdNodeId,
                tags: tags,
            },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    appId: `${appId}`,
                },
            }
        );

        assert.equal(updateNodeResponse.status, 200, `Expected status 200, got ${updateNodeResponse.status}`);
        assert.isObject(updateNodeResponse.data);
        assert.equal(updateNodeResponse.data.id, createdNodeId);

        // Step 4: Verify tags were added by querying nodes with tags
        const nodesWithTagsResponse = await apiClient.get('/api/pencil/node', {
            headers: {
                Authorization: `Bearer ${authToken}`,
                appId: `${appId}`,
            },
            params: {
                tags: tags.join(','),
            },
        });

        assert.equal(nodesWithTagsResponse.status, 200, `Expected status 200, got ${nodesWithTagsResponse.status}`);
        assert.isArray(nodesWithTagsResponse.data);
        const foundNode = nodesWithTagsResponse.data.find((node: any) => node.id === createdNodeId);
        assert.isObject(foundNode, 'Node should be found when querying by tags');
    });
});

