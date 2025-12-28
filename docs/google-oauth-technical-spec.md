# Technical Specification: Google OAuth 2.0 & JWT Token Exchange

## 1. Overview

This specification details the authentication architecture for a Chrome extension and a corresponding web application. The system utilizes Google Sign-In for user identity verification and implements a token exchange mechanism with a Node.js/TypeScript backend API. The backend supports multiple applications (multi-tenant) with user identity scoped by both email and appId, and issues **stateless JWT tokens** for session management.

## 2. Client Configuration

The architecture supports multiple OAuth 2.0 Client IDs to differentiate platforms and applications:

### Application-Specific Client IDs
- **Stocky (appId: 2)**: Android production and debug client IDs
- **Test (appId: 999)**: Test client ID
- **Beans (appId: 4)**: Configured but no client IDs yet

### Single Sign-On (SSO) Client IDs
- **Web Application**: Shared web client ID
- **Chrome Extension**: Chrome extension client ID

These SSO client IDs allow users to sign in without explicitly specifying an `appId`, enabling a unified authentication experience across platforms.

## 3. Authentication Flow

### Step A: Client-Side Authentication (Google)

1. **Initiation**: User initiates login via the Chrome Extension or Web App
2. **Google Auth**: Client redirects user to Google Authentication
3. **Token Retrieval**: Google redirects back to the client with a Google Access Token

### Step B: Backend Token Exchange

**API Endpoint**: `POST /api/public/signinGoogle`

**Request Body**:
```json
{
  "appId": 2,           // Optional
  "accessToken": "ya29.a0AfH6SMBx..."
}
```

**Process**:
1. Client sends the Google Access Token to the backend
2. Backend validates the token by calling Google's token info endpoint
3. Backend verifies:
   - Email is verified (`email_verified: true`)
   - Token has not expired (`expires_in > 0`)
   - Token audience (`aud`) matches a registered client ID

### Step C: AppId Resolution

The backend determines the effective `appId` using the following logic:

#### Case 1: AppId Provided in Request
If `appId` is explicitly provided in the request body, it is used directly after validation.

#### Case 2: AppId Not Provided (SSO Flow)
When `appId` is omitted, the system uses intelligent inference:

1. **Check for Existing User**:
   - Query database for users with the verified email address
   - If found, select the user with the **lowest appId**
   - Use that user's `appId` as the effective appId
   
2. **New User - Infer from Token Audience**:
   - If no existing user found, extract the `aud` (audience) from the Google token
   - Map the `aud` to an `appId` using the `GOOGLE_SIGN_IN_CLIENT_ID` configuration
   - If `aud` matches an SSO client ID, the inference fails and an error is returned

3. **Validation Failure**:
   - If `appId` cannot be determined, return error: `"Fail to sign in via Google: Invalid clientID or appId missing"`

#### Case 3: Token Audience Validation
After determining the effective `appId`, the backend validates that the token's `aud` is either:
- Listed in `GOOGLE_SIGN_IN_CLIENT_ID[effectiveAppId]`, OR
- Listed in `SSO_CLIENT_ID` (for SSO flows)

If validation fails, return error: `"Fail to sign in via Google: Invalid clientID"`

### Step D: User Resolution (Email + AppId Based)

**Important**: Unlike the initial documentation, users are **NOT** unified by email alone. Each user is uniquely identified by the combination of `(email, appId)`.

1. **Email Extraction**: Extract the verified email address from the Google Token payload
2. **User Lookup**: Query the database for a user matching both:
   - `email` = extracted email
   - `appId` = effective appId (determined in Step C)
3. **Provisioning**:
   - **Match Found**: Retrieve the existing user record
   - **No Match**: Create a new user record with:
     - `email`: from Google token
     - `appId`: effective appId
     - `passwordHash`: `undefined` (Google-only accounts have no password)

**Key Difference**: A user with email `user@example.com` can have separate accounts for `appId: 1` (Pencil) and `appId: 2` (Stocky). These are treated as distinct users.

### Step E: Session Creation (JWT Token)

1. **Token Generation**: The API generates a **JWT (JSON Web Token)** containing:
   ```typescript
   {
     userId: number,      // Database user ID
     appId: number,       // Application ID
     createdAt: number    // Timestamp (milliseconds)
   }
   ```

2. **Token Signing**: 
   - Token is signed using `accessTokenSecret` from backend configuration
   - Expiration set to `30 days`
   - Algorithm: HS256 (HMAC with SHA-256)

3. **Response**: Return the JWT token along with user information:
   ```json
   {
     "appId": 2,
     "userId": 42,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "email": "user@gmail.com",
     "groupIds": [1, 2]
   }
   ```

**Important**: The token is a **stateless JWT**, not an opaque token. It does not require database lookup for validation. The backend verifies the signature and expiration on each request.

## 4. Token Usage

### Attaching Tokens to Requests

All protected endpoints require the JWT token in the `Authorization` header:

```http
GET /api/bookmarks HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Verification

On each authenticated request, the backend:
1. Extracts the token from the `Authorization` header (format: `Bearer <token>`)
2. Verifies the JWT signature using `accessTokenSecret`
3. Checks token expiration
4. Extracts `userId` and `appId` from the payload
5. Uses these values to authorize the request

## 5. Multi-Tenancy Model

The system implements **app-scoped multi-tenancy**:

- **User Identity**: Scoped by `(email, appId)` combination
- **Data Isolation**: Each app has separate user records even for the same email
- **SSO Support**: SSO client IDs enable cross-app authentication by inferring appId from existing accounts

### Example Scenarios

#### Scenario 1: User with Multiple Apps
1. User signs up for Stocky (appId: 2) with `user@example.com`
2. User signs up for Pencil (appId: 1) with `user@example.com`
3. Result: Two separate user records exist in the database

#### Scenario 2: SSO Login (No AppId Specified)
1. User previously created account for Stocky (appId: 2)
2. User later creates account for Pencil (appId: 1)
3. User signs in via SSO without specifying appId
4. System finds both accounts, selects the one with lowest appId (Pencil, appId: 1)
5. User is authenticated as the Pencil user

## 6. Error Responses

| Status Code | Error Message | Cause |
|------------|---------------|-------|
| 400 | Fail to sign in via Google: Email was not verified | Google account email is not verified |
| 400 | Fail to sign in via Google: Token expired | Google access token has expired |
| 400 | Fail to sign in via Google: Invalid clientID or appId missing | Could not determine appId and token audience is unknown |
| 400 | Fail to sign in via Google: Invalid clientID | Token audience does not match expected client IDs for the appId |

## 7. Configuration Reference

### Supported App IDs

| App ID | Name | Description |
|--------|------|-------------|
| 0 | SSO | Single Sign-On |
| 1 | PENCIL | Pencil application |
| 2 | STOCKY | Inventory application |
| 3 | QUOTE | Quote application |
| 4 | BEANS | Beans application |
| 998 | TEST2 | Test environment 2 |
| 999 | TEST | Test environment |

### Google Client ID Mapping

The backend maintains a mapping of `appId` to allowed Google Client IDs in `GOOGLE_SIGN_IN_CLIENT_ID`:

```typescript
{
  "2": [  // Stocky
    "382777986560-uod78l19orsjivrlul4rqc6fn7e17gge.apps.googleusercontent.com",  // Android Production
    "382777986560-7hsnunnkrlqg9c7n7kacg5fs0gkkig75.apps.googleusercontent.com"   // Android Debug
  ],
  "999": [  // Test
    "test-client-id"
  ]
}
```

### SSO Client IDs

```typescript
[
  "578974658137-1udaimb8b46l9f9iv6ilgkdct0hm2fap.apps.googleusercontent.com",  // Web
  "578974658137-i249thql14qeej9ar2l9rms5r4cqq9lk.apps.googleusercontent.com"   // Chrome Extension
]
```

## 8. Security Considerations

1. **Token Validation**: All Google tokens are validated with Google's token info endpoint before acceptance
2. **Email Verification**: Only verified email addresses are accepted
3. **Client ID Whitelisting**: Only pre-configured client IDs are accepted
4. **JWT Expiration**: Tokens expire after 30 days
5. **Signature Verification**: All JWT tokens are cryptographically verified on each request
6. **HTTPS Required**: All authentication endpoints must be accessed over HTTPS in production

## 9. Key Differences from Original Specification

1. **Token Type**: Uses **JWT tokens** (stateless), not opaque tokens (stateful)
2. **User Identity**: Scoped by `(email, appId)`, not email alone
3. **Token Storage**: No database storage required for token validation (JWT is self-contained)
4. **AppId Handling**: Complex inference logic for SSO scenarios
5. **Multiple Accounts**: Same email can have multiple accounts across different apps
