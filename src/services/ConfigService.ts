import logger from '../utils/logger';
import dotenv from 'dotenv';
import fs from 'fs';
import { SecretsSchema } from '../types/schemas';

interface Config {
    s3Bucket: string;
    awsAccessKeyId: string;
    awsAccessKeySecret: string;
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
    const dotEnvPath = `/workspaces/app-configs/goapi/${isProd() ? 'prod' : 'dev'}/env.sh`;
    if (fs.existsSync(dotEnvPath)) {
        logger.info(`Load config from ${dotEnvPath}`);
        const result = dotenv.config({ path: dotEnvPath });
        if (result.error) {
            logger.error(`Fail to load config from file ${dotEnvPath}`);
        }
    }

    const config: Config = {
        s3Bucket: process.env.S3_BUCKET!,

        // The following vars are not used directly, they are used from process.env, just loaad them for verification
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        awsAccessKeySecret: process.env.AWS_SECRET_ACCESS_KEY!,
    
        gcp: {
            projectId: process.env.GCP_PROJECT_ID!,
            clientEmail: process.env.GCP_CLIENT_EMAIL!,
            privateKey: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        },
    };
    logger.info('Loaded config');
    return config;
}


// deprecated, secrets should be loaded from getSecrets
// export class ConfigService {
//     // deprecated, replaced by getConfig()
//     get() {
//         if (!config) {
//             config = loadConfig();
//         }
//         return config;
//     }
// }


export function getConfig(): Config {
    if (!config) {
        config = loadConfig();
    }
    return config;
}
export function isDev(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export function isProd(): boolean {
    return process.env.NODE_ENV === 'production';
}

export interface Secrets {
    // Secret to generate JWT token
    accessTokenSecret: string
    // Use this password to login to access for OCE tasks
    superAdminPassword: string
    // password embedded postgres url
    postgresUrl: string
}

export function getSecrets(): Secrets {    
    let secrets : Secrets = SecretsSchema.parse({
        accessTokenSecret: 'secret',
        superAdminPassword: 'secret',   
        postgresUrl: process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/postgres',         
    });
    if (isProd()) {
        secrets = SecretsSchema.parse({    
            accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
            superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,
            postgresUrl: process.env.POSTGRES_URL,
        });
    } 
    return SecretsSchema.parse(secrets);
}
