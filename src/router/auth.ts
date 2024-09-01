import express, { Router } from 'express';
import multer from 'multer';
import { apiHandler } from '../util/express-utils';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { SignInRequestSchema, SignUpRequestSchema } from '../types/schemas';
import { signIn, signup } from '../services/AccountService';

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 3,
    },
});

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
            const { email ,password } = SignUpRequestSchema.parse(req.body);
            const result = await signup(email, password);
            return result;
        }),
    );

    router.post(
        '/public/signin',
        apiHandler(async (req) => {
            const { email ,password } = SignInRequestSchema.parse(req.body);
            const result = await signIn(email, password);
            return result;
        }),
    );
    return router;
};
