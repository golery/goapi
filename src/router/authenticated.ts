import { Entity } from 'typeorm';
import express, { Router } from 'express';
import { services } from '../services/Factory';
import multer from 'multer';
import { apiHandler } from '../utils/express-utils';
import { Node } from '../entity/Node';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { syncRecords } from '../services/RecordService';
import { File } from '../entity/File.entity';
import logger from '../utils/logger';
import { CreateGroupRequestSchema } from '../types/schemas';
import { createGroup, getUserInfo } from '../services/AccountService';
import { ServerError } from '../utils/errors';
import * as fs from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { getEm } from '../services/db';

const MAX_SIZE = 1024 * 1024 * 3
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
        '/file/:app/:fileExt',
        apiHandler(async (req, res) => {
            // express request is a nodejs ReadableStream (https://nodejs.org/api/stream.html#readable-streams)
            const startTime = Date.now()
            const fileExt: string = req.params.fileExt;
            const app = 'stocky';
            const fileKey = `${app}.${uuidv4()}.${fileExt}`
            const filePath = `${app}/${fileKey}`;
            logger.info(`Uploading file to Google Cloud Storage ${filePath}`)
            
            let size = 0;
            // Create a Transform stream to intercept and count bytes
            const transform = new Transform({
                transform(chunk, encoding, callback) {
                    size += chunk.length; // Increment byte count
                    if (size > MAX_SIZE) {
                        callback(new ServerError(400, `File too large: ${size}`));                    
                    } else {               
                        callback(null, chunk);
                    }
                }
            });

        
            const uploadStream = services().imageService.getGcpUploadStream(filePath);
            try {
                await pipeline(req, transform, uploadStream);
                const file = new File();
                const ctx = req.ctx;
                file.appId = ctx.appId;
                file.userId = ctx.userId
                file.key = fileKey
                file.size = size
                getEm().persistAndFlush(file);
                logger.info(`Uploaded file ${filePath} ${size} bytes in ${Date.now() - startTime}ms`);
                return { key: fileKey };
            } catch (err) {
                logger.error(`Failed to upload file`, { err });
                if (err instanceof ServerError) {
                    throw err;
                }
                throw new ServerError(500, `Failed to upload file. Uploades so far ${size}`);
            }
        }),
    );

    // Deprecatd used by pencil with multer upload
    // Replaced by '/file/:app/:fileExt'
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
