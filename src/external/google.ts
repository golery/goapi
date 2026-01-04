import axios from "axios";
import logger from "../utils/logger";

export async function getTokenInfo(idToken: string): Promise<{ aud: string, email: string, email_verified: boolean, expires_in: number }> {
    // https://cloud.google.com/docs/authentication/token-types
    const start = Date.now();
    try {
        logger.info(`Retrieving token info from Google`);
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`;
        return (await axios.get(url)).data;
    } finally {
        logger.info(`Done. Retrieved token info from Google in ${Date.now() - start}ms`);
    }
}