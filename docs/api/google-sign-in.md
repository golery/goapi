# Google Sign-in API

### 1. Exchange Token
**POST** `/api/public/signinGoogle`

**Request Body:**
```json
{
  "accessToken": "GOOGLE_ACCESS_TOKEN",
  "appId": <appId>
}
```

**Response Body:**
```json
{
  "token": "JWT_TOKEN",
  "email": "user@example.com",
  "userId": <userId>,
  "appId": <appId>,
  "groupIds": [<groupId>]
}
```

### 2. Use Token
Include the `token` in the `Authorization` header for subsequent requests:

`Authorization: Bearer <JWT_TOKEN>`
