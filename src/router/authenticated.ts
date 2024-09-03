import express, { Router } from 'express';
import { services } from '../services/Factory';
import multer from 'multer';
import { apiHandler } from '../utils/express-utils';
import { Node } from '../entity/Node';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { syncRecords } from '../services/RecordService';
import logger from '../utils/logger';

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 3,
    },
});

/**
 * List of API examples.
 * @route GET /api
 */
export const getAuthenticatedRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

    router.post(
        '/file/:app',
        upload.single('file'),
        apiHandler(async (req, res) => {
            const file = (req as any).file;
            const uploadParams = {
                app: req.params.app,
                fileName: file.originalname,
                mime: file.mimetype,
                buffer: file.buffer,
            };
            const response = await services().imageService.upload(uploadParams);
            res.send(response);
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
            logger.info('Syncing records');
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

    // ping and return current authenticated user
    router.get(
        '/ping',
        apiHandler(async (req) => {        
            logger.info('Pinged', req.ctx);    
            return req.ctx;        
        }),
    );
    return router;
};
