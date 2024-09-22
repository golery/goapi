import express, { Router } from 'express';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { getBucket } from '../services/FileService';
import { apiHandler } from '../utils/express-utils';

/**
 * List of API examples.
 * @route GET /api
 */
export const getOpsRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

    // Move fiels between buckets
    router.post(
        '/move',
        apiHandler(async (req) => {
            const bucket = await getBucket();
            const filess = await bucket.getFiles({ prefix: 'pencil.', maxResults: 1000 })
            const files = filess[0];
            for (const file of files) {
                console.log('===>', file.name);
                await file.move(`pencil/${file.name}`);
            }
            return {
                files
            }
      }),
    );

    return router;
};
