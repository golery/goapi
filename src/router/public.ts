import express, { Router } from 'express';
import { apiHandler } from '../util/express-utils';
import { SignInRequestSchema, SignUpRequestSchema } from '../types/schemas';
import { signIn, signup } from '../services/AccountService';

export const getPublicRouter = (): Router => {
    const router = express.Router();
    router.post(
        '/signup',
        apiHandler(async (req) => {
            console.log('====>');
            const { appId, email, password } = SignUpRequestSchema.parse(req.body);
            return await signup(appId, email, password);    
        }),
    );

    router.post(
        '/signin',
        apiHandler(async (req) => {
            const { appId, email, password } = SignInRequestSchema.parse(req.body);
            return await signIn(appId, email, password);        
        }),
    );
    return router;
};
