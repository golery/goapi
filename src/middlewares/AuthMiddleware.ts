import express from 'express';
import { MOCK_TOKEN, verifyJwt } from '../services/AccountService';
import { APP_ID_HEADER, GROUP_ID_HEADER } from '../contants';
import { Ctx } from '../types/context';

export const authMiddleware = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => {
    const authorization = req.header('Authorization');
    // temporarily disable auth
    const byPassAuth = req.url.startsWith('/recordxx/');

    if (authorization === `Bearer ${MOCK_TOKEN}` || byPassAuth) {
        const appId = Number.parseInt(req.header(APP_ID_HEADER));
        const groupId = req.header(GROUP_ID_HEADER);
        Object.assign(req, { ctx: { userId: 1, appId, groupId } });
        next();
        return;
    } 

    if (authorization && authorization.startsWith('Bearer ')) {
        const jwtPayload = verifyJwt(authorization);
        const groupId = Number.parseInt(req.header(GROUP_ID_HEADER));
        const ctx: Ctx = { userId: jwtPayload.userId, appId: jwtPayload.appId, groupId };
        Object.assign(req, { ctx });
        next();
        return;
    }

    console.log('No auth');
    res.status(401).send();    
};
