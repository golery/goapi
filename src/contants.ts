import { ServerError } from "./utils/errors";

export enum AppIds {
    SSO = 0,
    PENCIL = 1,
    // Inventory app
    STOCKY = 2,
    QUOTE = 3,
    BEANS = 4,
    TEST = 999,
    TEST2 = 998,
}

const AppIdToName: Record<AppIds, string> = {
    [AppIds.SSO]: 'sso',
    [AppIds.BEANS]: 'beans',
    [AppIds.PENCIL]: 'pencil',
    [AppIds.STOCKY]: 'stocky',
    [AppIds.QUOTE]: 'quote',
    [AppIds.TEST]: 'test',
    [AppIds.TEST2]: 'test2',
}

export function getAppName(appId: AppIds) {
    const name = AppIdToName[appId];
    if (!name) {
        throw new ServerError(400, `Invalid appId ${appId}`);
    }
    return name;
}

export const APP_ID_HEADER = 'appId';
export const GROUP_ID_HEADER = 'groupId';

export const ACCESS_TOKEN_EXPIRES_IN = '30 days';

// The following are client ID of Google Sign in configured at // https://console.cloud.google.com/apis/credentials?project=golery-inventory
// After mobile signs in, it has an access token and sends it to backend. Backend exchanges it to get details and verify the audience one of those client ID.
export const GOOGLE_SIGN_IN_CLIENT_ID: Record<string, string[]> = {
    [`${AppIds.STOCKY}`]: [
        // Android - Stocky - Production
        '382777986560-uod78l19orsjivrlul4rqc6fn7e17gge.apps.googleusercontent.com',
        // Android - Stocky - Debug
        '382777986560-7hsnunnkrlqg9c7n7kacg5fs0gkkig75.apps.googleusercontent.com',
    ],
    [`${AppIds.TEST}`]: [
        'test-client-id'
    ],
    [`${AppIds.BEANS}`]: [
        // Beans - Bookmarks extensions
        // https://console.cloud.google.com/apis/credentials?project=golery 
        '578974658137-i249thql14qeej9ar2l9rms5r4cqq9lk.apps.googleusercontent.com',
    ],
}

// Login without specifying app ID
export const SSO_CLIENT_ID = '578974658137-1udaimb8b46l9f9iv6ilgkdct0hm2fap.apps.googleusercontent.com';
