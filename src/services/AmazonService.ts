import {S3Client} from '@aws-sdk/client-s3';
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html
const REGION = 'us-east-1';

export class AmazonService {
    getS3Client() {
        return new S3Client({region: REGION});
    }
}