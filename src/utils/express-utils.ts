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
                    if (!res.headersSent) {
                        res.send(data);
                    }
                    logger.info(`DONE-REQUEST. [${req.method} ${req.url}]: 200 in ${Date.now() - startTime}ms`, { ctx });
                })
                .catch((err) => {
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    const errorStack = err instanceof Error ? err.stack : undefined;

                    if (res.headersSent) {
                        logger.error(`FAILED REQUEST [${req.method} ${req.url}] (Headers already sent)`, { ctx, error: errorMsg, stack: errorStack });
                        return next(err);
                    }

                    if (err instanceof ServerError) {
                        const errorResponse = {
                            code: err.code,
                            message: err.message,
                            data: err.data,
                        }
                        res.status(err.code).json(errorResponse);
                        logger.warn(`FAILED REQUEST [${req.method} ${req.url}]: ${err.code} ${err.message}`, { ctx, errorResponse });
                    } else if (err.isAxiosError) {
                        const { response: errResponse } = err;
                        if (errResponse) {
                            const response = {
                                code: errResponse.status,
                                message: errResponse.statusText,
                                data: errResponse.data,
                            };
                            logger.error(`FAILED REQUEST [${req.method} ${req.url}]: Downstream error`, { ctx, response, error: errorMsg });
                            res.status(errResponse.status).json(response);
                        } else {
                            logger.error(`FAILED REQUEST [${req.method} ${req.url}] (No response)`, { ctx, error: errorMsg });
                            next(err);
                        }
                    } else {
                        logger.error(`FAILED REQUEST [${req.method} ${req.url}]`, { ctx, error: errorMsg, stack: errorStack });
                        next(err);
                    }
                });
        };


