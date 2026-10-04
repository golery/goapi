# Legal acceptance

A signed-in user records that they accepted the terms and privacy documents shown to them. Each accept call inserts a new row. The server sets the user, app id (from the access token), the time, and the client IP.

## Get latest acceptance

- **Method**: `GET`
- **Path**: `/api/legal/acceptance`
- **Auth**: `Authorization: Bearer <token>`

Returns the most recent acceptance for the user and app from the token. **404** when the user has not accepted yet.

## Accept terms and privacy

- **Method**: `POST`
- **Path**: `/api/legal/accept`
- **Auth**: `Authorization: Bearer <token>`

## Body

```json
{
  "terms": "https://example.com/terms",
  "privacy": "https://example.com/privacy"
}
```

`terms` and `privacy` are the http(s) URLs of the documents presented at acceptance time. The app is taken from the token (`appId` on the user / JWT), not from the body.

## Response

```json
{
  "id": 1,
  "userId": 12,
  "appId": 2,
  "terms": "https://example.com/terms",
  "privacy": "https://example.com/privacy",
  "ipAddress": "203.0.113.10",
  "acceptedAt": "2026-10-04T18:00:00.000Z"
}
```

The client IP is the first address in `X-Forwarded-For` when that header is present, otherwise the connection address.

Invalid body returns **400**. Missing or invalid token returns **401**.
