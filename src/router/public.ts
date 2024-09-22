import express, { Router } from 'express';
import { apiHandler } from '../utils/express-utils';
import { SignInGoogleRequestSchema, SignInRequestSchema, SignUpRequestSchema } from '../types/schemas';
import { signIn, signInGoogle, signup } from '../services/AccountService';
import { AppIds } from '../contants';
import { services } from '../services/Factory';
import { downloadFile } from '../services/FileService';

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

    router.get(
        '/config/stocky',
        apiHandler(async () => {        
            return {
                appId: AppIds.STOCKY,
                minVersion: 1,
                apiBaseUrl: 'https://api.stocky.io',
            };        
        }),
    );

    router.get(
        '/file/:id',
        apiHandler(async (req, res) => {
            await downloadFile(req.params.id, res);
        }),
    );

    return router;
};
