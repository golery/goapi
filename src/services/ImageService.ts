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
    //deprecated
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

    //deprecated
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
}
