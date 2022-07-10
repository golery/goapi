import express, {Router} from 'express';
import {services} from '../services/Factory';
import multer from 'multer';
import {apiHandler} from '../util/express-utils';
import logger from '../util/logger';
import {Node} from '../entity/Node';
import {Storage} from '@google-cloud/storage';
import {login} from '../services/AccountService';
import {authMiddleware} from '../middlewares/AuthMiddleware';

/**
 * Backend router are API for Verxel backend
 * @route GET /api/backend/*
 */
export const getBackendRouter = (): Router => {
    const router = express.Router();

    router.get('/pencil/public-node-ids',
        apiHandler(async (req, res) => {
            const nodes = await services().pencilService.getPublicNodeIds();
            res.json(nodes);
        }));
    router.get('/pencil/public-node/:nodeId',
        apiHandler(async (req, res) => {
            const nodes = await services().pencilService.getPublicNode(parseInt(req.params.nodeId));
            res.json(nodes);
        }));

    return router;
};
