# Frontend Documentation: Sign In with Google

This document provides specialized guidance for frontend developers integrating the Google Sign-In endpoint.

## Endpoint Details

- **Endpoint**: `POST /api/public/signinGoogle`
- **Authentication**: Public (no token required)

### Request Format

The request body should be a JSON object containing the `accessToken` obtained from Google. The `appId` is now optional.

```json
{
  "accessToken": "ya29.a0AfH6SMBx...",
  "appId": 2 // Optional
}
```

### Response Format (200 OK)

Returns user profile Information and a JWT token for subsequent requests.

```json
{
  "appId": 2,
  "userId": 42,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@gmail.com",
  "groupIds": [1]
}
```

## How `appId` is Handled

When you omit `appId`, the backend uses the following logic to determine which application the user is signing into:

1.  **Existing Users**: The system first checks if the user's email is already registered. If multiple accounts exist (e.g., for different apps), it will select the one with the **lowest `appId`**.
2.  **New Users**: If the user is new, the system looks at the Google Token's audience (`aud`). It matches the `aud` against the registered client IDs on the backend to infer the correct `appId`.

> [!TIP]
> **Best Practice**: If your frontend is dedicated to a single application (e.g., Stocky mobile app), it is recommended to register your Client IDs on the backend so you can safely omit `appId`. This simplifies the frontend logic.

## Error Handling

| Status | Message | Cause |
| :--- | :--- | :--- |
| `400` | Fail to sign in via Google: Invalid clientID | The `aud` in the token is not recognized for any registered `appId`. |
| `400` | Fail to sign in via Google: Email was not verified | The Google account's email has not been verified. |
| `400` | Fail to sign in via Google: Token expired | The Google access token has expired. |

