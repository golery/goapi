import express, { Router } from 'express';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { services } from '../services/Factory';
import { apiHandler } from '../utils/express-utils';
import { extractMetadata } from '../utils/url-metadata';

export const getBeansRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

    // Collection endpoints
    router.post(
        '/collection',
        apiHandler(async (req) => {
            return await services().bookmarkService.createCollection(
                req.body.name,
                req.ctx.userId.toString(),
            );
        }),
    );

    router.get(
        '/collection',
        apiHandler(async (req) => {
            return await services().bookmarkService.listCollections(req.ctx.userId.toString());
        }),
    );

    router.put(
        '/collection/:id',
        apiHandler(async (req) => {
            return await services().bookmarkService.updateCollection(
                req.params.id,
                req.body.name,
                req.ctx.userId.toString(),
            );
        }),
    );

    router.delete(
        '/collection/:id',
        apiHandler(async (req) => {
            return await services().bookmarkService.deleteCollection(
                req.params.id,
                req.ctx.userId.toString(),
            );
        }),
    );

    // Bookmark endpoints
    router.post(
        '/bookmark',
        apiHandler(async (req) => {
            return await services().bookmarkService.addBookmark(req.ctx.userId.toString(), req.body);
        }),
    );

    router.put(
        '/bookmark/:id',
        apiHandler(async (req) => {
            return await services().bookmarkService.updateBookmark(
                req.params.id,
                req.ctx.userId.toString(),
                req.body,
            );
        }),
    );

    router.delete(
        '/bookmark/:id',
        apiHandler(async (req) => {
            return await services().bookmarkService.deleteBookmark(
                req.params.id,
                req.ctx.userId.toString(),
            );
        }),
    );

    router.get(
        '/bookmark',
        apiHandler(async (req) => {
            return await services().bookmarkService.getAllBookmarks(req.ctx.userId.toString());
        }),
    );

    router.post(
        '/web/metadata',
        apiHandler(async (req) => {
            const { url } = req.body;
            if (!url) {
                throw new Error('URL is required'); // Or use a proper bad request error if available
            }
            return await extractMetadata(url);
        }),
    );

    return router;
};
