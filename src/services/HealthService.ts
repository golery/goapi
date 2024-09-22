import logger from "../utils/logger";
import { getBucket } from "./FileService";

export async function healthCheck() {
    logger.info('Running health check...');
    const bucket = await getBucket();
    const filesInPencil = await bucket.getFiles({ prefix: 'pencil/', maxResults: 1000 });
    const filesInStocky = await bucket.getFiles({ prefix: 'stocky/', maxResults: 1000 });
    const result = {
        cloudStorage: {
            buckeId: bucket.id,
            filesInPencil: filesInPencil[0].length,
            filesInStocky: filesInStocky[0].length,
        }
    }
    logger.info('Finished health check', { result });
    return result;
} 