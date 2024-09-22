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
import { getBucket, uploadFile } from '../services/FileService';

/**
 * List of API examples.
 * @route GET /api
 */
export const getOpsRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

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
