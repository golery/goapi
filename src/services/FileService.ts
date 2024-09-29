import { Ctx } from './../types/context.d';
import { Bucket, Storage } from "@google-cloud/storage";
import { Response } from "express";
import { extension } from 'mime-types';
import { Transform } from "stream";
import { finished, pipeline } from "stream/promises";
import { v4 as uuidv4 } from 'uuid';
import { getAppName } from "../contants";
import { File } from "../entity/File.entity";
import { ApiRequest } from "../types/context";
import { ServerError } from "../utils/errors";
import logger from "../utils/logger";
import { getConfig } from "./ConfigService";
import { getEm } from "./db";
import mime from 'mime-types';
import fs from 'fs';

const MAX_SIZE = 1024 * 1024 * 3

export async function uploadFile(ctx: Ctx, contentType: string | undefined, bodyStream: NodeJS.ReadableStream) {
    // express request is a nodejs ReadableStream (https://nodejs.org/api/stream.html#readable-streams)
    const startTime = Date.now()
    if (!contentType || !contentType?.startsWith('image')) {
        throw new ServerError(400, `Unsupported content type ${contentType}`);
    }

    const fileExt = extension(contentType);
    const appId = ctx.appId;

    const appName = getAppName(appId);
    const fileKey = `${appName}.${uuidv4()}.${fileExt}`
    const filePath = `${appName}/${fileKey}`;
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
        await pipeline(bodyStream, transform, uploadStream);
        const file = new File();    
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
    return storage.bucket(getConfig().s3Bucket);
}


export async function downloadFile(key: string, response: Response) {
    try {
        const contentType = mime.contentType(key) || 'application/octet-stream';
        response.contentType(contentType);

        const cacheFilePath = `/tmp/${key}}`
        if (fs.existsSync(cacheFilePath)) {            
            const fileStream = fs.createReadStream(cacheFilePath);
            await pipeline(fileStream, response);   
            logger.info(`Cache miss. Fetched file from gcp ${key} ${contentType}`);                     
            return;
        }

        const [app] = key.split('.');
        const path = `${app}/${key}`;
        const gcpFile = getBucket().file(path);
        const [meta] = await gcpFile.getMetadata();

        const fromStream = await gcpFile.createReadStream();
        const toFileStream = fs.createWriteStream(cacheFilePath);

        fromStream.pipe(toFileStream);
        fromStream.pipe(response);

        await finished(toFileStream);    
        await finished(response);    
        logger.debug(`Downloaded file ${key}`, { key, contentType });        
    } catch (err) {
        if ((err as any).code === 404) {
            logger.error(`Failed to download file. File not found ${key}`, { key, err });
            throw new ServerError(404, `Failed to download file. ${(err as any).errors?.[0]?.message}`);
        }
        logger.error('Failed to download file', { key, err });
        throw new ServerError(500, 'Failed to download file');
    }
}