import logger from '../util/logger';
import dotenv from 'dotenv';
import fs from 'fs';

interface Config {
    s3Bucket: string;
    awsAccessKeyId: string;
    awsAccessKeySecret: string;
    postgresUrl: string;
    gcp: {
        projectId: string;
        clientEmail: string;
        privateKey: string;
    };
}

let config: Config;

export function loadConfig(): Config {
    const isProd = () => process.env.NODE_ENV === 'production';

    // On prod/env.sh is ONLY used at local to hook to prod DB. On real prod, we use environment variable in Koeyb
    const dotEnvPath = `/work/app-configs/goapi/${isProd() ? 'prod' : 'dev'}/env.sh`;
    if (fs.existsSync(dotEnvPath)) {
        logger.info(`Load config from ${dotEnvPath}`);
        const result = dotenv.config({ path: dotEnvPath });
        if (result.error) {
            logger.error(`Fail to load config from file ${dotEnvPath}`);
        }
    }

    const config: Config = {
        s3Bucket: process.env.S3_BUCKET,

        // The following vars are not used directly, they are used from process.env, just loaad them for verification
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsAccessKeySecret: process.env.AWS_SECRET_ACCESS_KEY,
        postgresUrl: process.env.POSTGRES_URL,

        gcp: {
            projectId: process.env.GCP_PROJECT_ID,
            clientEmail: process.env.GCP_CLIENT_EMAIL,
            privateKey: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
    };
    // TODO: validate all fields
    if (!config.postgresUrl) {
        throw new Error('Undefined process.env.POSTGRES_URL');
    }
    logger.info('Loaded config');
    return config;
}

export class ConfigService {
    get() {
        if (!config) {
            config = loadConfig();
        }
        return config;
    }
}
