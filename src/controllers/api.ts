'use strict';

import express, {Router} from 'express';
import {services} from '../services/Factory';
import multer from 'multer';
import {apiHandler} from '../util/express-utils';
import logger from '../util/logger';

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 3
    }
});

/**
 * List of API examples.
 * @route GET /api
 */
export const getRoute = (): Router => {
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

    router.get('/pencil/books',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.getBooks();
            res.json(books);
        }));

    router.get('/pencil/book/:bookId',
        apiHandler(async (req, res) => {
            const books = await services().pencilService.getBook(parseInt(req.params.bookId));
            res.json(books);
        }));
    return router;
};
