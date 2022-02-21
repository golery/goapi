import logger from './logger';
import dotenv from 'dotenv';
import fs from 'fs';

const DOT_ENV_PATH = process.env.DOT_ENV_PATH || '/work/app-configs/dev/goapi2/.env.sh';

logger.info(`Load config from ${DOT_ENV_PATH}`);
if (fs.existsSync(DOT_ENV_PATH)) {
    dotenv.config({ path: DOT_ENV_PATH });
}

export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === 'production'; // Anything else is treated as 'dev'
//
// export const SESSION_SECRET = process.env['SESSION_SECRET'];
// export const MONGODB_URI = prod ? process.env['MONGODB_URI'] : process.env['MONGODB_URI_LOCAL'];

// if (!SESSION_SECRET) {
//     logger.error('No client secret. Set SESSION_SECRET environment variable.');
//     process.exit(1);
// }
//
// if (!MONGODB_URI) {
//     if (prod) {
//         logger.error('No mongo connection string. Set MONGODB_URI environment variable.');
//     } else {
//         logger.error('No mongo connection string. Set MONGODB_URI_LOCAL environment variable.');
//     }
//     process.exit(1);
// }
