"use strict";

import graph from "fbgraph";
import express, {Response, Request, NextFunction, Router} from "express";
import {UserDocument} from "../models/User";
import {services} from "../services/Factory";
import multer from "multer";
import {apiHandler} from "../util/express-utils";
import logger from "../util/logger";

const upload = multer({
    limits: {
        fileSize: 1024 * 1024 * 3
    }
});

/**
 * List of API examples.
 * @route GET /api
 */
export const getRoute = (): Router => {
    const router = express.Router();
    router.post("/file/:app", upload.single("file"), async (req, res) => {
        const file = (req as any).file;
        const uploadParams = {
            app: req.params.app,
            fileName: file.originalname,
            mime: file.mimetype,
            buffer: file.buffer
        };
        const response = await services().imageService.upload(uploadParams);
        res.send({...response, data: undefined});
    });

    router.get("/file/:id",
        apiHandler(async (req, res) => {
            const {data, contentType} = await services().imageService.download(req.params.id);
            res.contentType(contentType);
            (data as any).pipe(res);
            logger.info("Downloaded");
        }));
    return router;

};


/**
 * Facebook API example.
 * @route GET /api/facebook
 */
export const getFacebook = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserDocument;
    const token = user.tokens.find((token: any) => token.kind === "facebook");
    graph.setAccessToken(token.accessToken);
    graph.get(`${user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err: Error, results: graph.FacebookUser) => {
        if (err) {
            return next(err);
        }
        res.render("api/facebook", {
            title: "Facebook API",
            profile: results
        });
    });
};
