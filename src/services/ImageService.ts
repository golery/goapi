import { services } from './Factory';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mime from 'mime-types';
import { Bucket, Storage } from '@google-cloud/storage';
import * as stream from 'stream';
import * as util from 'util';
import express from 'express';

export interface ImageUploadRequest {
    app: string;
    fileName: string;
    mime: string;
    buffer: Buffer;
}

const pipeline = util.promisify(stream.pipeline);

export class ImageService {
    //
    // async uploadS3(request: ImageUploadRequest) {
    //     const id = uuidv4();
    //     const ext = path.extname(request.fileName) || mime.extension(request.mime) || '';
    //     const config = services().config.get();
    //     const s3Client = services().amazonService.getS3Client();
    //
    //     const params: PutObjectCommandInput = {
    //         Bucket: config.s3Bucket,
    //         Key: `${request.app}.${id}${ext}`,
    //         Body: request.buffer,
    //         ContentType: request.mime
    //     };
    //     const results = await s3Client.send(new PutObjectCommand(params));
    //     logger.info('Created file in S3.', {bucket: params.Bucket, key: params.Key});
    //     return {bucket: params.Bucket, key: params.Key, data: results, contentType: params.ContentType}; // For unit tests.
    // }

    // async downloadS3(id: string) {
    //     const config = services().config.get();
    //     const s3Client = services().amazonService.getS3Client();
    //     const bucketParams = {
    //         Bucket: config.s3Bucket,
    //         Key: id,
    //     };
    //     try {
    //         const data: GetObjectCommandOutput = await s3Client.send(new GetObjectCommand(bucketParams));
    //         return {data: data.Body, contentType: data.ContentType};
    //     } catch (e) {
    //         logger.warn(`S3 Key not found ${id}`);
    //     }
    // }

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
        const file = this.getBucket().file(key);
        const [meta] = await file.getMetadata();
        const fromStream = await file.createReadStream();
        response.contentType(meta.contentType);
        await pipeline(fromStream, response);
    }
}
