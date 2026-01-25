import axios from 'axios';
import * as cheerio from 'cheerio';

export interface UrlMetadata {
    title?: string;
    description?: string;
    image?: string;
}

export async function extractMetadata(url: string): Promise<UrlMetadata> {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 5000,
        });

        const $ = cheerio.load(response.data);

        const metadata: UrlMetadata = {};

        // Title
        metadata.title =
            $('meta[property="og:title"]').attr('content') ||
            $('title').text() ||
            $('meta[name="twitter:title"]').attr('content');

        // Description
        metadata.description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content');

        // Image
        metadata.image =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content');

        return metadata;
    } catch (error) {
        console.error(`Failed to fetch metadata for ${url}:`, error);
        return {};
    }
}
