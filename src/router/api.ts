import express, {Router} from 'express';
import {apiHandler} from '../util/express-utils';
import {login} from '../services/AccountService';
import {getAuthenticatedRouter} from './authenticated';

/**
 * List of API examples.
 * @route GET /api
 */
export const getApiRouter = (): Router => {
    const router = express.Router();

    router.post('/login', apiHandler(async (req, res) => {
        const { username, password } = req.body;
        console.log(`Login for ${username}`);
        const result = login(username, password);
        if (result) {
            res.json(result);
        } else {
            console.log('Login failed');
            res.status(401).send();
        }
    }));

    router.use('/', getAuthenticatedRouter());
    return router;


};
