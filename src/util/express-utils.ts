import express from 'express';
import logger from './logger';
import { ApiRequest } from 'types/context';
import { ServerError } from './errors';

// express js 4 handles exception for only synchronous handler
// for async, need to explicitly call next(error), otherwise app crashes.
export const apiHandler =
    (execute: (req: ApiRequest, res: express.Response) => Promise<any>) =>
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        execute(req as ApiRequest, res)
            .then((data) => data && res.send(data))
            .catch((err) => {
                logger.error(`Fail to handle request ${req.url}: ${err.message}`, { err });
                if (err instanceof ServerError) {
                    res.status(err.code).json({
                        code: err.code,
                        message: err.message,
                        data: err.data,
                    });
                } else {
                    logger.error(`Fail to handle request ${req.url}`);
                    next(err);
                }
            });
    };


