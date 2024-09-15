import express from 'express';
import logger from './logger';
import { ApiRequest } from 'types/context';
import { ServerError } from './errors';
import * as _ from 'lodash';

// express js 4 handles exception for only synchronous handler
// for async, need to explicitly call next(error), otherwise app crashes.
export const apiHandler =
    (execute: (req: ApiRequest, res: express.Response) => Promise<any>) =>
        (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction,
        ) => {
            const startTime = Date.now();
            const ctx = _.get(req, 'ctx') ?? {}
            logger.info(`REQUEST [${req.method} ${req.url}]`, { ctx });
            execute(req as ApiRequest, res)
                .then((data) => {
                    res.send(data);
                    logger.info(`DONE-REQUEST. [${req.method} ${req.url}]: 200 in ${Date.now() - startTime}ms`, { ctx });
                })
                .catch((err) => {
                    if (err instanceof ServerError) {
                        const errorResponse = {
                            code: err.code,
                            message: err.message,
                            data: err.data,
                        }
                        res.status(err.code).json(errorResponse);
                        logger.warn(`FAILED REQUEST [${req.method} ${req.url}]: ${err.code} ${err.message}`, { ctx: (req as any).ctx, errorResponse });
                    } else if (err.isAxiosError) {
                        const { response: errResponse } = err;
                        if (errResponse) {
                            const response = {
                                code: errResponse.status,
                                message: errResponse.statusText,
                                data: errResponse.data,
                            };
                            logger.error(`FAILED REQUEST [${req.method} ${req.url}]: Downstream error from ${err.response.config?.method} ${err.response.config?.url}`, { ctx: (req as any).ctx, response });
                            res.status(errResponse.status).json(response);
                        } else {
                            logger.error(`FAILED REQUEST [${req.method} ${req.url}]`, { ctx: (req as any).ctx });
                            next(err);
                        }
                    } else {
                        logger.error(`FAILED REQUEST [${req.method} ${req.url}]`, { ctx: (req as any).ctx });
                        next(err);
                    }
                });
        };


