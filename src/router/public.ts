import express, { Router } from 'express';
import { apiHandler } from '../utils/express-utils';
import { SignInGoogleRequestSchema, SignInRequestSchema, SignUpRequestSchema } from '../types/schemas';
import { signIn, signInGoogle, signup } from '../services/AccountService';

export const getPublicRouter = (): Router => {
    const router = express.Router();
    router.post(
        '/signup',
        apiHandler(async (req) => {
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

    router.post(
        '/signinGoogle',
        apiHandler(async (req) => {
            const { appId, accessToken } = SignInGoogleRequestSchema.parse(req.body);
            return await signInGoogle(appId, accessToken);        
        }),
    );
    return router;
};
