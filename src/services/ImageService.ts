import { services } from './Factory';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mime from 'mime-types';
import { Bucket, Storage } from '@google-cloud/storage';
import * as stream from 'stream';
import * as util from 'util';
import express from 'express';
import logger from '../utils/logger';
import { ServerError } from '../utils/errors';

export interface ImageUploadRequest {
    app: string;
    fileName: string;
    mime: string;
    buffer: Buffer;
}

const pipeline = util.promisify(stream.pipeline);

export class ImageService {
    // https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream
    async upload(request: ImageUploadRequest) {
        console.log('Upload', request.fileName, request.mime);
        const id = uuidv4();
        let ext =
            path.extname(request.fileName) ||
            mime.extension(request.mime) ||
            '';
        if (ext.length > 0 && !ext.startsWith('.')) {
            ext = '.' + ext;
        }

        const fromStream = new stream.PassThrough();
        fromStream.end(request.buffer);

        const bucket = this.getBucket();
        const key = `${request.app}.${id}${ext}`;
        const toStream = bucket.file(key).createWriteStream();

        await pipeline(fromStream, toStream);
        return { key };
    }

    getGcpUploadStream(filePath: string): NodeJS.WritableStream {
        const bucket = this.getBucket();
        return bucket.file(filePath).createWriteStream();
    }

    getBucket(): Bucket {
        const { projectId, clientEmail, privateKey } =
            services().config.get().gcp;
        const storage = new Storage({
            projectId,
            credentials: {
                client_email: clientEmail,
                private_key: privateKey,
            },
        });
        return storage.bucket(services().config.get().s3Bucket);
    }

    async download(key: string, response: express.Response) {
        try {
            const [app] = key.split('.');
            let path = key;
            if (app !== 'pencil') {
                path = `${app}/${key}`;
            } 

            const file = this.getBucket().file(path);
            const [meta] = await file.getMetadata();
            const fromStream = await file.createReadStream();
            response.contentType(meta.contentType);
            await pipeline(fromStream, response);
        } catch (err) {
            if ((err as any).code === 404) {
                logger.error(`Failed to download file. File not found ${key}`, { key, err });
                throw new ServerError(404, `Failed to download file. ${(err as any).errors?.[0]?.message}`);    
            }
            logger.error('Failed to download file', { key, err });
            throw new ServerError(500, 'Failed to download file');
        }
    }
}
