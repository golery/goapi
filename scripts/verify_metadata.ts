
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:8200/api';
const EMAIL = `verify+${uuidv4()}@test.com`;
const PASSWORD = 'Password123!';
const APP_ID = 100; // Assuming 100 is a valid AppId (taken from public.test.ts)

async function verify() {
    try {
        console.log(`1. Signing up user: ${EMAIL}...`);
        const signupRes = await axios.post(`${BASE_URL}/public/signup`, {
            email: EMAIL,
            password: PASSWORD,
            appId: APP_ID
        });

        const token = signupRes.data.token;
        console.log('   Signup successful. Token:', token ? 'Received' : 'Missing');

        if (!token) {
            console.error('Failed to get token');
            process.exit(1);
        }

        console.log('2. Testing /beans/web/metadata endpoint...');
        const targetUrl = 'https://google.com';
        const metadataRes = await axios.post(
            `${BASE_URL}/beans/web/metadata`,
            { url: targetUrl },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        console.log('   Response status:', metadataRes.status);
        console.log('   Metadata:', metadataRes.data);

        if (metadataRes.data.title && metadataRes.data.title.includes('Google')) {
            console.log('SUCCESS: Metadata extraction works!');
        } else {
            console.error('FAILURE: Metadata title missing or incorrect');
            process.exit(1);
        }

    } catch (error: any) {
        console.error('Verification failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

verify();
