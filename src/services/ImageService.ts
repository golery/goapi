import {services} from "./Factory";
import {v4 as uuidv4} from "uuid";
import path from "path";
import {GetObjectCommand, GetObjectCommandOutput, PutObjectCommand, PutObjectCommandInput} from "@aws-sdk/client-s3";
import logger from "../util/logger";
import mime from "mime-types";

export interface ImageUploadRequest {
    app: string
    fileName: string
    mime: string
    buffer: Buffer
}

export class ImageService {


    async upload(request: ImageUploadRequest) {
        const id = uuidv4();
        const ext = path.extname(request.fileName) || mime.extension(request.mime) || "";
        const config = services().config.get();
        const s3Client = services().amazonService.getS3Client();

        const params: PutObjectCommandInput = {
            Bucket: config.s3Bucket,
            Key: `${request.app}.${id}${ext}`,
            Body: request.buffer,
            ContentType: request.mime
        };
        const results = await s3Client.send(new PutObjectCommand(params));
        logger.info("Created file in S3.", {bucket: params.Bucket, key: params.Key});
        return {bucket: params.Bucket, key: params.Key, data: results, contentType: params.ContentType}; // For unit tests.
    }

    async download(id: string) {
        const config = services().config.get();
        const s3Client = services().amazonService.getS3Client();
        const bucketParams = {
            Bucket: config.s3Bucket,
            Key: id,
        };
        try {
            const data: GetObjectCommandOutput = await s3Client.send(new GetObjectCommand(bucketParams));
            return {data: data.Body, contentType: data.ContentType};
        } catch (e) {
            logger.warn(`S3 Key not found ${id}`);
        }
    }
}
