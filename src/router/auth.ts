import express, { Router } from 'express';
import { apiHandler } from '../util/express-utils';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { SignInRequestSchema, SignUpRequestSchema } from '../types/schemas';
import { signIn, signup } from '../services/AccountService';

/**
 * List of API examples.
 * @route GET /api
 */
export const getAuthRouter = (): Router => {
    const router = express.Router();
    router.use(authMiddleware);

    router.post(
        '/public/signup',
        apiHandler(async (req) => {
            const { appId, email, password } = SignUpRequestSchema.parse(req.body);
            const result = await signup(appId, email, password);
            return result;
        }),
    );

    router.post(
        '/public/signin',
        apiHandler(async (req) => {
            const { appId, email, password } = SignInRequestSchema.parse(req.body);
            const result = await signIn(appId, email, password);
            return result;
        }),
    );
    return router;
};
