import { Transform } from "stream";
import logger from "../utils/logger";
import { v4 as uuidv4 } from 'uuid';
import { ServerError } from "../utils/errors";
import { services } from "./Factory";
import { File } from "../entity/File.entity";
import { pipeline } from "stream/promises";
import { getEm } from "./db";
import { ApiRequest } from "../types/context";
import { Express, Response } from "express";
import { Bucket, Storage } from "@google-cloud/storage";
import { extension } from 'mime-types';
import { AppIds, getAppName } from "../contants";
import { getConfig } from "./ConfigService";

const MAX_SIZE = 1024 * 1024 * 3

export async function uploadFile(req: ApiRequest) {
    // express request is a nodejs ReadableStream (https://nodejs.org/api/stream.html#readable-streams)
    const startTime = Date.now()
    const ctx = req.ctx;
    const contentType = req.header('content-type');
    if (!contentType || !contentType?.startsWith('image')) {
        throw new ServerError(400, `Unsupported content type ${contentType}`);
    }

    const fileExt = extension(contentType);
    const appId = ctx.appId;

    const appName = getAppName(appId);
    const fileKey = `${appName}.${uuidv4()}.${fileExt}`
    let filePath = `${appName}/${fileKey}`;
    if (appId === AppIds.PENCIL) {
        filePath = fileKey;
    }


    logger.info(`Uploading file to Google Cloud Storage ${filePath}`)
    
    let size = 0;
    // Create a Transform stream to intercept and count bytes
    const transform = new Transform({
        transform(chunk, encoding, callback) {
            size += chunk.length; // Increment byte count
            if (size > MAX_SIZE) {
                callback(new ServerError(400, `File too large: ${size}`));                    
            } else {               
                callback(null, chunk);
            }
        }
    });


    const uploadStream = getGcpUploadStream(filePath);
    try {
        await pipeline(req, transform, uploadStream);
        const file = new File();
        const ctx = req.ctx;
        file.appId = ctx.appId;
        file.userId = ctx.userId
        file.key = fileKey
        file.size = size
        await getEm().persistAndFlush(file);
        logger.info(`Uploaded file ${filePath} ${size} bytes in ${Date.now() - startTime}ms`);
        return { key: fileKey };
    } catch (err) {
        logger.error(`Failed to upload file`, { err });
        if (err instanceof ServerError) {
            throw err;
        }
        throw new ServerError(500, `Failed to upload file. Uploades so far ${size}. ${(err as any).message}`);
    }
}

function getGcpUploadStream(filePath: string): NodeJS.WritableStream {
    const bucket = getBucket();
    return bucket.file(filePath).createWriteStream();
}

export function getBucket(): Bucket {
    const { projectId, clientEmail, privateKey } =
        getConfig().gcp;
    const storage = new Storage({
        projectId,
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
    });
    return storage.bucket(services().config.get().s3Bucket);
}


export async function downloadFile(key: string, response: Response) {
    try {
        const [app] = key.split('.');
        let path = key;
        if (app !== 'pencil') {
            path = `${app}/${key}`;
        } 

        const file = getBucket().file(path);
        const [meta] = await file.getMetadata();
        const fromStream = await file.createReadStream(); 
        response.contentType(meta.contentType);
        await pipeline(fromStream, response);
        logger.info(`Downloaded file ${key} ${meta.contentType}`);
    } catch (err) {
        if ((err as any).code === 404) {
            logger.error(`Failed to download file. File not found ${key}`, { key, err });
            throw new ServerError(404, `Failed to download file. ${(err as any).errors?.[0]?.message}`);    
        }
        logger.error('Failed to download file', { key, err });
        throw new ServerError(500, 'Failed to download file');
    }
}