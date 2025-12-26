import express, { Router } from 'express';
import { Node } from '../entity/Node';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { createGroup, getUserInfo } from '../services/AccountService';
import { services } from '../services/Factory';
import { uploadFile } from '../services/FileService';
import { getKeyValues, putKeyValues } from '../services/KeyValueService';
import { syncRecords } from '../services/RecordService';
import { apiHandler } from '../utils/express-utils';
import logger from '../utils/logger';
import { ChatRequestSchema } from '../types/schemas';
import { BadRequestError } from '../utils/exceptions';

/**
 * List of API examples.
 * @route GET /api
 */
export const getAuthenticatedRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

    router.post(
        '/file',
        apiHandler(async (req) => {
            const contentType = req.header('content-type');        
            return uploadFile(req.ctx, contentType, req);
      }),
    );

    router.get(
        '/pencil/book/:bookId/node',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.query(
                parseInt(req.params.bookId),
            );
            res.json(books);
        }),
    );

    router.get(
        '/pencil/node',
        apiHandler(async (req, res) => {
            const tagsParam = req.query.tags;
            if (!tagsParam) {
                return res.status(400).json({ error: 'tags query parameter is required' });
            }
            const tags = Array.isArray(tagsParam)
                ? tagsParam.map(t => String(t))
                : String(tagsParam).split(',').map(t => t.trim()).filter(t => t);
            const nodes = await services().pencilService.findNodesByTags(tags);
            res.json(nodes);
        }),
    );

    router.get(
        '/pencil/tags',
        apiHandler(async (req, res) => {
            const tags = await services().pencilService.getAllTags();
            res.json(tags);
        }),
    );

    router.get(
        '/pencil/tags/count',
        apiHandler(async (req, res) => {
            const counts = await services().pencilService.getTagCounts();
            res.json(counts);
        }),
    );

    router.get(
        '/pencil/book',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.getBooks();
            res.json(books);
        }),
    );

    router.post(
        '/pencil/book',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.createBook(req.body);
            res.json(books);
        }),
    );

    router.post(
        '/pencil/move/:nodeId',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.moveNode(
                parseInt(req.params.nodeId),
                req.body,
            );
            res.json(node);
        }),
    );

    router.post(
        '/pencil/add/:nodeId',
        apiHandler(async (req, res) => {
            const position = req.body.position !== undefined ? parseInt(req.body.position) : 0;
            const data = req.body.data;
            const node = await services().pencilService.addNode(
                parseInt(req.params.nodeId),
                position,
                data,
            );
            res.json(node);
        }),
    );

    router.post(
        '/pencil/update',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.updateNode(
                req.body as Node,
            );
            res.json(node);
        }),
    );
    router.delete(
        '/pencil/delete/:nodeId',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.deleteNode(
                parseInt(req.params.nodeId),
            );
            res.json(node);
        }),
    );

    router.put(
        '/record/sync',
        apiHandler(async (req) => {
            logger.info(`Syncing records for group ${req.ctx.groupId}`);
            const parsedFromTime = Number.parseInt(
                (req.query.fromTime as string) ?? '0',
            );
            const fromTime = isNaN(parsedFromTime) ? 0 : parsedFromTime;

            return await syncRecords(
                req.ctx,

                fromTime,
                req.body.records,
                req.query.delete === 'true',
            );
        }),
    );

    router.get('/kv', apiHandler(async (req) => {
        const keys: string[] = Array.isArray(req.query.key) ? req.query.key : [req.query.key] as any;
        return await getKeyValues(req.ctx, keys);
    }));

    router.put('/kv', apiHandler(async (req) => {
        return await putKeyValues(req.ctx,req.body);
    }));

    // ping and return current authenticated user
    router.get(
        '/ping',
        apiHandler(async (req) => {
            logger.info('Pinged', { ctx: req.ctx, url: req.url });
            return req.ctx;
        }),
    );

    router.post('/group', apiHandler(async (req) => {
        return await createGroup(req.ctx);
    }));

    router.get('/user', apiHandler(async (req) => {
        return await getUserInfo(req.ctx);
    }));

    router.post(
        '/pencil/node/:nodeId/chat',
        async (req, res, next) => {
            try {
                const nodeId = parseInt(req.params.nodeId);
                if (isNaN(nodeId)) {
                    return res.status(400).json({ error: 'Invalid nodeId' });
                }

                // Validate request body
                const { question, chatHistory } = ChatRequestSchema.parse(req.body);

                // Get node and descendants
                const nodes = await services().pencilService.getNodeWithDescendants(nodeId);
                if (nodes.length === 0) {
                    return res.status(404).json({ error: 'Node not found' });
                }

                // Check if chat service is configured
                if (!process.env.GEMINI_API_KEY) {
                    return res.status(503).json({ error: 'Chat service not configured. GEMINI_API_KEY is required.' });
                }

                // Set up SSE headers
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

                // Stream response from ChatService
                const stream = services().chatService.streamChatResponse(
                    question,
                    nodes,
                    chatHistory,
                );

                // Handle client disconnect
                req.on('close', () => {
                    logger.info('Client disconnected from chat stream');
                });

                // Stream chunks
                for await (const chunk of stream) {
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                }

                // Send completion message
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                res.end();
            } catch (error: any) {
                logger.error('Error in chat endpoint', { error: error.message, stack: error.stack });
                
                if (error.name === 'ZodError') {
                    return res.status(400).json({ error: 'Invalid request body', details: error.errors });
                }
                
                if (error instanceof BadRequestError) {
                    return res.status(400).json({ error: error.message });
                }

                // Check if it's an API key error
                if (error.message && error.message.includes('Gemini API key')) {
                    return res.status(503).json({ error: 'Chat service not configured. GEMINI_API_KEY is required.' });
                }

                // For SSE, we need to send error as an event
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Internal server error' });
                } else {
                    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                    res.end();
                }
            }
        },
    );

    return router;
};
