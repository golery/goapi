import express, { Router } from 'express';
import { Node } from '../entity/Node';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { createGroup, getUserInfo } from '../services/AccountService';
import { services } from '../services/Factory';
import { uploadFile } from '../services/FileService';
import { syncRecords } from '../services/RecordService';
import { apiHandler } from '../utils/express-utils';
import logger from '../utils/logger';
import { ServerError } from '../utils/errors';
import { getKeyValues, putKeyValues } from '../services/KeyValueService';

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
            const node = await services().pencilService.addNode(
                parseInt(req.params.nodeId),
                parseInt(req.params.position),
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

    return router;
};
