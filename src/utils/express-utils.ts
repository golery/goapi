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
                    if (err instanceof ServerError) {
                        logger.error(`FAILED REQUEST [${req.method} ${req.url}]: ${err.code}-${err.message}`, { err });
                        res.status(err.code).json({
                            code: err.code,
                            message: err.message,
                            data: err.data,
                        });
                    } else if (err.isAxiosError) {                                                
                        const { response: errResponse } = err;                        
                        if (errResponse) {                            
                            const response = {
                                code: errResponse.status,
                                message: errResponse.statusText,
                                data: errResponse.data,
                           };
                            logger.error(`Fail to handle request ${req.url}: Downstream error from ${err.response.config?.method} ${err.response.config?.url}`, { response });
                            res.status(errResponse.status).json(response);
                        } else {
                            logger.error(`Fail to handle request ${req.url}`);
                            next(err);
                        }
                    } else {
                        logger.error(`Fail to handle request ${req.url}`);
                        next(err);
                    }
                });
        };


