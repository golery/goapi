import express from 'express';
import { MOCK_TOKEN, verifyJwt } from '../services/AccountService';
import { APP_ID_HEADER, GROUP_ID_HEADER } from '../contants';
import { Ctx } from '../types/context';
import { parseIntOpt } from '../utils/parser';

export const authMiddleware = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
): void => {
    const authorizationHeader = req.header('Authorization');

    const groupId = parseIntOpt(req.header(GROUP_ID_HEADER));

    if (authorizationHeader === `Bearer ${MOCK_TOKEN}`) {
        const appId = parseIntOpt(req.header(APP_ID_HEADER));        
        Object.assign(req, { ctx: { userId: 1, appId, groupId } });
        next();
        return;
    } 

    if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
        const payload = verifyJwt(authorizationHeader);    
        if (!payload) {
            res.status(401).send('Invalid Authorization header');
            return;
        }
        const ctx: Ctx = { appId: payload.appId, userId: payload.userId, groupId};    
        Object.assign(req, { ctx });
        next();
        return;
    }

    res.status(401).send('Failed authentication');
};
