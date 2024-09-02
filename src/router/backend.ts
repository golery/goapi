import express, { Router } from 'express';
import { services } from '../services/Factory';
import { apiHandler } from '../utils/express-utils';

/**
 * Backend router are API for Verxel backend
 * @route GET /api/backend/*
 */
export const getBackendRouter = (): Router => {
    const router = express.Router();

    router.get(
        '/pencil/public-node-ids',
        apiHandler(async (req, res) => {
            const nodes = await services().pencilService.getPublicNodeIds();
            res.json(nodes);
        }),
    );
    router.get(
        '/pencil/public-node/:nodeId',
        apiHandler(async (req, res) => {
            const nodes = await services().pencilService.getPublicNode(
                parseInt(req.params.nodeId),
            );
            res.json(nodes);
        }),
    );
    return router;
};
