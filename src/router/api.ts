import express, { Router } from 'express';
import { downloadFile } from '../services/FileService';
import { apiHandler } from '../utils/express-utils';
import { getAuthenticatedRouter } from './authenticated';
import { getBackendRouter } from './backend';
import { getPublicRouter } from './public';

export const getApiRouter = (): Router => {
    const router = express.Router();

    // deprecated
    router.use('/backend', getBackendRouter());

    router.use('/public', getPublicRouter());

    router.use('/', getAuthenticatedRouter());
    return router;
};
 