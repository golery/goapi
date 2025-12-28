# Authentication API Guideline

This document describes the authentication endpoints and how to use JWT tokens for API access. All authentication endpoints are prefixed with `/api/public` and do not require authentication. Protected endpoints require a valid Bearer token in the `Authorization` header.

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
  - [Sign Up](#sign-up)
  - [Sign In](#sign-in)
  - [Sign In with Google](#sign-in-with-google)
- [Using Authentication Tokens](#using-authentication-tokens)
  - [Token Structure](#token-structure)
  - [Attaching Tokens to Requests](#attaching-tokens-to-requests)
  - [Token Expiration](#token-expiration)
- [App IDs Reference](#app-ids-reference)
- [Security Best Practices](#security-best-practices)
- [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

---

## Authentication Endpoints

### Sign Up
Create a new user account with email and password.

- **Method**: `POST`
- **Path**: `/api/public/signup`
- **Headers**: None required
- **Body**:
  ```json
  {
    "appId": 1,
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "appId": 1,
    "userId": 42,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "user@example.com",
    "groupIds": [1, 2]
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid email format, weak password, or user already exists
  - Password requirements: Validated by `validatePassword()` function
- **Usage**: Use this endpoint to create new user accounts. Store the returned `token` securely for subsequent API calls.

---

### Sign In
Authenticate an existing user with email and password.

- **Method**: `POST`
- **Path**: `/api/public/signin`
- **Headers**: None required
- **Body**:
  ```json
  {
    "appId": 1,
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "appId": 1,
    "userId": 42,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "user@example.com",
    "groupIds": [1, 2]
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: User not found, invalid password, or user was not created with password
- **Usage**: Use this endpoint to authenticate existing users. The returned `token` should be stored securely and used for all authenticated API requests.

---

### Sign In with Google
Authenticate using a Google OAuth access token. From the frontend perspective, `appId` is now optional.

- **Method**: `POST`
- **Path**: `/api/public/signinGoogle`
- **Headers**: None required
- **Body**:
  ```json
  {
    "appId": 2, // Optional
    "accessToken": "ya29.a0AfH6SMBx..."
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "appId": 2,
    "userId": 42,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "user@gmail.com",
    "groupIds": [1]
  }
  ```
- **Optional `appId` Handling**:
  If `appId` is not provided in the request:
  1. **Existing User**: The system will look for an existing account matching the Google email. If multiple accounts exist for different apps, it will pick the one with the **lowest `appId`**.
  2. **New User**: If no account exists for that email, the system will infer the `appId` from the Google Token's audience (`aud`). It maps the client ID used by the frontend to the corresponding application.
- **Error Responses**:
  - `400 Bad Request`: Invalid client ID, email not verified, token expired, or `appId` could not be determined.
- **Usage**: 
  1. Obtain a Google OAuth access token from Google Sign-In on your client.
  2. Send the access token to this endpoint. You can omit `appId` if your client ID is already registered for a specific app on the backend.
  3. If the user doesn't exist, a new account is created automatically using the inferred `appId`.
  4. Store the returned JWT `token` for subsequent API calls.

---

## Using Authentication Tokens

### Token Structure

The authentication token is a **JWT (JSON Web Token)** that contains:
- `userId`: The unique identifier of the authenticated user
- `appId`: The application ID the user belongs to
- `createdAt`: Timestamp when the token was created
- **Expiration**: 30 days from creation

The token is signed using a secret key and verified on each authenticated request.

---

### Attaching Tokens to Requests

All protected API endpoints (those not under `/api/public`) require authentication. To authenticate a request:

1. **Include the `Authorization` header** with the format: `Bearer <token>`
2. **Optionally include additional headers**:
   - `appId`: Application ID (optional, extracted from token if not provided)
   - `groupId`: Group context for multi-tenant operations (optional)

#### Example Request Headers
```http
GET /api/user HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

### Token Expiration

- **Validity Period**: Tokens are valid for **30 days** from creation
- **Expired Tokens**: Will return `401 Unauthorized`
- **Refresh Strategy**: When a token expires, the user must sign in again to obtain a new token
- **Best Practice**: Store the token securely (e.g., in secure storage on mobile, httpOnly cookies on web)

---

## App IDs Reference

The following `appId` values are currently supported:

| App ID | Name    | Description           |
|--------|---------|----------------------|
| 1      | PENCIL  | Pencil application   |
| 2      | STOCKY  | Inventory app        |
| 3      | QUOTE   | Quote application    |
| 999    | TEST    | Test environment     |
| 998    | TEST2   | Test environment 2   |

Use the appropriate `appId` for your application when calling authentication endpoints.

---

## Security Best Practices

1. **Never expose tokens in URLs** - Always use the `Authorization` header
2. **Store tokens securely**:
   - Web: Use httpOnly cookies or secure localStorage
   - Mobile: Use secure storage (Keychain on iOS, Keystore on Android)
3. **Handle token expiration gracefully** - Implement automatic logout on 401 responses
4. **Use HTTPS** - Always use HTTPS in production to prevent token interception
5. **Don't log tokens** - Avoid logging authentication tokens in client-side code
6. **Implement token refresh** - Consider implementing a token refresh mechanism for better UX

---

## Common Issues and Troubleshooting

### 401 Unauthorized
- **Cause**: Missing, invalid, or expired token
- **Solution**: Ensure the `Authorization` header is properly formatted as `Bearer <token>` and the token hasn't expired

### 400 Bad Request on Sign Up
- **Cause**: Invalid email format, weak password, or user already exists
- **Solution**: Validate email format and password strength on the client side before sending

### Token Not Working After Sign In
- **Cause**: Token not properly stored or retrieved
- **Solution**: Verify token is being saved correctly and retrieved before making authenticated requests

### CORS Errors
- **Cause**: Cross-origin request blocked
- **Solution**: Ensure your domain is whitelisted on the backend, or use a proxy in development
