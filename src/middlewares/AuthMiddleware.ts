import express from 'express';
import {MOCK_TOKEN} from '../services/AccountService';

export const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authorization = req.header('Authorization');
    if (authorization === `Bearer ${MOCK_TOKEN}`) {
        Object.assign(req, { ctx: { userId: 1}});
        next();
    } else {
        console.log('No auth');
        res.status(401).send();
    }
};