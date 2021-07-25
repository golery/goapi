import express from "express";
import logger from "./logger";

// express js 4 handles exception for only synchronous handler
// for async, need to explicitly call next(error), otherwise app crashes.
export const apiHandler = (execute: (req: express.Request, res: express.Response) => Promise<any>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        execute(req, res)
            .then(data => data && res.send(data))
            .catch(err => {
                logger.error(`Fail to handle request ${req.url}`);
                next(err);
            });
    };