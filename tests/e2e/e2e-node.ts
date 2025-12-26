import { assert } from 'chai';
import { describe } from 'mocha';
import axios, { AxiosInstance } from 'axios';
import * as uuid from 'uuid';
import { AppIds } from '../../src/contants';
import { MOCK_TOKEN } from '../../src/services/AccountService';

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
        // Output bookId and nodeId
        // It's not clear which variable is "bookId" exactly from context, but assuming it's the createdNodeId.
        // If createBookResponse.data.node contains something called bookId, output it as well.
        // We'll output both for clarity.
        // For test logging, use console.log.
        console.log('Created Book:', createBookResponse.data.node);
        console.log('createdNodeId:', createdNodeId);
    });

    it('should create a node with image links and update them', async () => {
        const appId = AppIds.TEST;
        const testAuthToken = MOCK_TOKEN;
        const rootNodeId = 3205; // Hardcoded parent node id

        // Step 1: Add a child node with image links
        const initialImages = [
            { url: 'file-key-1' },
            { url: 'file-key-2' },
            { url: 'file-key-3' },
        ];
        
        const addNodeResponse = await apiClient.post(
            `/api/pencil/add/${rootNodeId}`,
            {
                position: 0,
                data: {
                    images: initialImages,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${testAuthToken}`,
                    appId: `${appId}`,
                },
            }
        );

        assert.equal(addNodeResponse.status, 200, `Expected status 200, got ${addNodeResponse.status}`);
        assert.isObject(addNodeResponse.data);
        assert.isNumber(addNodeResponse.data.id);
        const childNodeId = addNodeResponse.data.id;
        
        // Verify images were stored
        assert.isObject(addNodeResponse.data.data);
        assert.isArray(addNodeResponse.data.data.images);
        assert.equal(addNodeResponse.data.data.images.length, 3);
        assert.deepEqual(addNodeResponse.data.data.images, initialImages);

        // Step 2: Update the node with different image links
        const updatedImages = [
            { url: 'file-key-4' },
            { url: 'file-key-5' },
        ];
        
        const updateNodeResponse = await apiClient.post(
            '/api/pencil/update',
            {
                id: childNodeId,
                type: 'IMAGE',
                data: {
                    images: updatedImages,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${testAuthToken}`,
                    appId: `${appId}`,
                },
            }
        );

        assert.equal(updateNodeResponse.status, 200, `Expected status 200, got ${updateNodeResponse.status}`);
        assert.isObject(updateNodeResponse.data);
        assert.equal(updateNodeResponse.data.id, childNodeId);
        
        // Verify type was updated
        assert.equal(updateNodeResponse.data.type, 'IMAGE', 'Type should be updated to IMAGE');
        
        // Verify images were updated
        assert.isObject(updateNodeResponse.data.data);
        assert.isArray(updateNodeResponse.data.data.images);
        assert.equal(updateNodeResponse.data.data.images.length, 2);
        assert.deepEqual(updateNodeResponse.data.data.images, updatedImages);
    });

    it('should chat about node content with streaming response and follow-up questions', async function () {
        this.timeout(30000); // Increase timeout for LLM calls
        
        const appId = AppIds.TEST;
        const testAuthToken = MOCK_TOKEN;
        const rootNodeId = 3205; // Hardcoded parent node id

        // Step 1: Create a node with content
        const addNodeResponse = await apiClient.post(
            `/api/pencil/add/${rootNodeId}`,
            {
                position: 0,
                data: {
                    title: 'Test Node for Chat',
                    description: 'This is a test node with some content to chat about.',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${testAuthToken}`,
                    appId: `${appId}`,
                },
            }
        );

        assert.equal(addNodeResponse.status, 200, `Expected status 200, got ${addNodeResponse.status}`);
        const nodeId = addNodeResponse.data.id;
        assert.isNumber(nodeId);

        // Step 2: Update node with name and text
        await apiClient.post(
            '/api/pencil/update',
            {
                id: nodeId,
                name: 'Chat Test Node',
                text: 'This node contains information about testing chat functionality. It has some text content that can be discussed.',
            },
            {
                headers: {
                    Authorization: `Bearer ${testAuthToken}`,
                    appId: `${appId}`,
                },
            }
        );

        // Step 3: Add a child node
        const addChildResponse = await apiClient.post(
            `/api/pencil/add/${nodeId}`,
            {
                position: 0,
                data: {
                    content: 'Child node content',
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${testAuthToken}`,
                    appId: `${appId}`,
                },
            }
        );
        const childNodeId = addChildResponse.data.id;

        // Step 4: Make first chat request
        const firstQuestion = 'Summarize content of nodes';
        let firstResponse = '';
        let chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        try {
            const chatResponse = await apiClient.post(
                `/api/pencil/chat`,
                {
                    question: firstQuestion,
                    nodeTree: [nodeId],
                },
                {
                    headers: {
                        Authorization: `Bearer ${testAuthToken}`,
                        appId: `${appId}`,
                    },
                    responseType: 'stream',
                }
            );

            // Check if API key is missing
            if (chatResponse.status === 503) {
                console.log('Skipping chat test: GEMINI_API_KEY not configured');
                this.skip();
                return;
            }

            assert.equal(chatResponse.status, 200, `Expected status 200, got ${chatResponse.status}`);
            assert.equal(chatResponse.headers['content-type'], 'text/event-stream');

            // Parse SSE stream
            const stream = chatResponse.data;
            let buffer = '';
            
            await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                if (data.chunk) {
                                    firstResponse += data.chunk;
                                }
                                if (data.done) {
                                    resolve();
                                    return;
                                }
                                if (data.error) {
                                    reject(new Error(data.error));
                                    return;
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete JSON
                            }
                        }
                    }
                });

                stream.on('end', () => {
                    if (buffer) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    if (data.chunk) {
                                        firstResponse += data.chunk;
                                    }
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                        }
                    }
                    resolve();
                });

                stream.on('error', reject);
            });

            assert.isNotEmpty(firstResponse, 'First response should not be empty');
            console.log('=== First Chat Request ===');
            console.log('Message to LLM:', firstQuestion);
            console.log('Response from LLM:', firstResponse);
            chatHistory.push({ role: 'user', content: firstQuestion });
            chatHistory.push({ role: 'assistant', content: firstResponse });
        } catch (error: any) {
            // If GEMINI_API_KEY is not set, skip the test
            if ((error.message && error.message.includes('Gemini API key')) || 
                (error.response && error.response.status === 503 && 
                 error.response.data && error.response.data.error && 
                 error.response.data.error.includes('GEMINI_API_KEY'))) {
                console.log('Skipping chat test: GEMINI_API_KEY not configured');
                this.skip();
                return;
            }
            throw error;
        }

        // Step 5: Make follow-up question with chat history
        const followUpQuestion = 'Write a full report 10 sentences about content of all nodes';
        let followUpResponse = '';

        try {
            const followUpChatResponse = await apiClient.post(
                `/api/pencil/chat`,
                {
                    question: followUpQuestion,
                    chatHistory: chatHistory,
                    nodeTree: [nodeId],
                },
                {
                    headers: {
                        Authorization: `Bearer ${testAuthToken}`,
                        appId: `${appId}`,
                    },
                    responseType: 'stream',
                }
            );

            assert.equal(followUpChatResponse.status, 200, `Expected status 200, got ${followUpChatResponse.status}`);
            assert.equal(followUpChatResponse.headers['content-type'], 'text/event-stream');

            // Parse SSE stream
            const stream = followUpChatResponse.data;
            let buffer = '';
            
            await new Promise<void>((resolve, reject) => {
                stream.on('data', (chunk: Buffer) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));
                                if (data.chunk) {
                                    followUpResponse += data.chunk;
                                }
                                if (data.done) {
                                    resolve();
                                    return;
                                }
                                if (data.error) {
                                    reject(new Error(data.error));
                                    return;
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete JSON
                            }
                        }
                    }
                });

                stream.on('end', () => {
                    if (buffer) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    if (data.chunk) {
                                        followUpResponse += data.chunk;
                                    }
                                } catch (e) {
                                    // Ignore parse errors
                                }
                            }
                        }
                    }
                    resolve();
                });

                stream.on('error', reject);
            });

            assert.isNotEmpty(followUpResponse, 'Follow-up response should not be empty');
            console.log('=== Follow-up Chat Request ===');
            console.log('Message to LLM:', followUpQuestion);
            console.log('Response from LLM:', followUpResponse);
            // The follow-up response should show awareness of the previous conversation
            // (though we can't assert specific content since LLM responses are variable)
        } catch (error: any) {
            // If GEMINI_API_KEY is not set, skip the test
            if ((error.message && error.message.includes('Gemini API key')) || 
                (error.response && error.response.status === 503 && 
                 error.response.data && error.response.data.error && 
                 error.response.data.error.includes('GEMINI_API_KEY'))) {
                console.log('Skipping follow-up chat test: GEMINI_API_KEY not configured');
                this.skip();
                return;
            }
            throw error;
        }
    });
});

