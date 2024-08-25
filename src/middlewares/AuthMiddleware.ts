import express from 'express';
import {MOCK_TOKEN} from '../services/AccountService';
import { APP_ID_HEADER, GROUP_ID_HEADER } from '../contants';

export const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authorization = req.header('Authorization');

    // temporarily disable auth
    const byPassAuth = req.url.startsWith('/record/');

    if (authorization === `Bearer ${MOCK_TOKEN}` || byPassAuth) {
        const appId = req.header(APP_ID_HEADER);
        const groupId = req.header(GROUP_ID_HEADER);
        Object.assign(req, { ctx: { userId: 1, appId, groupId}});
        next();
    } else {
        console.log('No auth');
        res.status(401).send();
    }
};