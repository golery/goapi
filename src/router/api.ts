import express, { Router } from 'express';
import { apiHandler } from '../utils/express-utils';
import { login } from '../services/AccountService';
import { getAuthenticatedRouter } from './authenticated';
import { services } from '../services/Factory';
import { getBackendRouter } from './backend';
import { getPublicRouter } from './public';

export const getApiRouter = (): Router => {
    const router = express.Router();

    // deprecated, replaced by /public/
    router.get(
        '/file/:id',
        apiHandler(async (req, res) => {
            await services().imageService.download(req.params.id, res);
        }),
    );

    // deprecated
    router.use('/backend', getBackendRouter());

    router.use('/public', getPublicRouter());

    router.use('/', getAuthenticatedRouter());
    return router;
};
 