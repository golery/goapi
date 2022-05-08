'use strict';

import express, {Router} from 'express';
import {services} from '../services/Factory';
import multer from 'multer';
import {apiHandler} from '../util/express-utils';
import logger from '../util/logger';
import {Node} from '../entity/Node';
import {Storage} from '@google-cloud/storage';

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 3
    }
});

/**
 * List of API examples.
 * @route GET /api
 */
export const getApiRouter = (): Router => {
    const router = express.Router();
    router.post('/file/:app', upload.single('file'), apiHandler(async (req, res) => {
        const file = (req as any).file;
        const uploadParams = {
            app: req.params.app,
            fileName: file.originalname,
            mime: file.mimetype,
            buffer: file.buffer
        };
        const response = await services().imageService.upload(uploadParams);
        res.send({...response, data: undefined});
    }));

    router.get('/file/buckets',
        apiHandler(async (req, res) => {
            const {projectId, clientEmail, privateKey} = services().config.get().gcp;
            const storage = new Storage({
                projectId, credentials: {
                    client_email: clientEmail,
                    private_key: privateKey,
                }
            });

            const [buckets] = await storage.getBuckets();

            res.send({buckets: buckets.map(b => b.metadata.id)});
        }));

    router.get('/file/:id',
        apiHandler(async (req, res) => {
            const response = await services().imageService.download(req.params.id);
            if (!response) {

                res.status(404).send('S3 key not found');
            }
            const {data, contentType} = response;
            res.contentType(contentType);
            (data as any).pipe(res);
            logger.info('Downloaded');
        }));

    router.get('/pencil/book/:bookId/node',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.query(parseInt(req.params.bookId));
            res.json(books);
        }));

    router.get('/pencil/book',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.getBooks();
            res.json(books);
        }));


    router.post('/pencil/book',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.createBook(req.body);
            res.json(books);
        }));

    router.post('/pencil/move/:nodeId',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.moveNode(parseInt(req.params.nodeId), req.body);
            res.json(node);
        }));

    router.post('/pencil/add/:nodeId',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.addNode(parseInt(req.params.nodeId), parseInt(req.params.position));
            res.json(node);
        }));

    router.post('/pencil/update',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.updateNode(req.body as Node);
            res.json(node);
        }));
    router.delete('/pencil/delete/:nodeId',
        apiHandler(async (req, res) => {
            const node = await services().pencilService.deleteNode(parseInt(req.params.nodeId));
            res.json(node);
        }));
    return router;


};
