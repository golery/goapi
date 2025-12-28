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
- [Code Examples](#code-examples)

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
Authenticate using a Google OAuth access token.

- **Method**: `POST`
- **Path**: `/api/public/signinGoogle`
- **Headers**: None required
- **Body**:
  ```json
  {
    "appId": 2,
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
- **Error Responses**:
  - `400 Bad Request`: Invalid client ID, email not verified, or token expired
- **Usage**: 
  1. Obtain a Google OAuth access token from Google Sign-In on your client
  2. Send the access token to this endpoint
  3. If the user doesn't exist, a new account is created automatically
  4. Store the returned JWT `token` for subsequent API calls

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

## Code Examples

### JavaScript/TypeScript (Fetch API)

#### Sign Up
```javascript
async function signUp(email, password) {
  const response = await fetch('https://api.example.com/api/public/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appId: 1,
      email: email,
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sign up failed: ${error}`);
  }

  const data = await response.json();
  // Store the token securely
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userId', data.userId);
  
  return data;
}
```

#### Sign In
```javascript
async function signIn(email, password) {
  const response = await fetch('https://api.example.com/api/public/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      appId: 1,
      email: email,
      password: password,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sign in failed: ${error}`);
  }

  const data = await response.json();
  // Store the token securely
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userId', data.userId);
  
  return data;
}
```

#### Making Authenticated Requests
```javascript
async function getUserInfo() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch('https://api.example.com/api/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Token expired or invalid - redirect to login
    localStorage.removeItem('authToken');
    throw new Error('Authentication failed. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }

  return await response.json();
}
```

#### Creating an Authenticated API Client
```javascript
class ApiClient {
  constructor(baseUrl, appId) {
    this.baseUrl = baseUrl;
    this.appId = appId;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async signUp(email, password) {
    const response = await fetch(`${this.baseUrl}/api/public/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: this.appId, email, password }),
    });

    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async signIn(email, password) {
    const response = await fetch(`${this.baseUrl}/api/public/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: this.appId, email, password }),
    });

    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async authenticatedRequest(path, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.token = null;
      throw new Error('Authentication expired. Please sign in again.');
    }

    return response;
  }

  async getUser() {
    const response = await this.authenticatedRequest('/api/user');
    return await response.json();
  }

  async createGroup() {
    const response = await this.authenticatedRequest('/api/group', {
      method: 'POST',
    });
    return await response.json();
  }
}

// Usage
const client = new ApiClient('https://api.example.com', 1);
await client.signIn('user@example.com', 'password123');
const userInfo = await client.getUser();
```

---

### React Example with Axios

```javascript
import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: 'https://api.example.com/api',
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear storage and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication functions
export const authService = {
  async signUp(email, password) {
    const { data } = await api.post('/public/signup', {
      appId: 1,
      email,
      password,
    });
    localStorage.setItem('authToken', data.token);
    return data;
  },

  async signIn(email, password) {
    const { data } = await api.post('/public/signin', {
      appId: 1,
      email,
      password,
    });
    localStorage.setItem('authToken', data.token);
    return data;
  },

  signOut() {
    localStorage.removeItem('authToken');
  },

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },
};

// Protected API calls
export const userService = {
  async getUserInfo() {
    const { data } = await api.get('/user');
    return data;
  },

  async createGroup() {
    const { data } = await api.post('/group');
    return data;
  },
};
```

---

### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.example.com/api';
const APP_ID = 1;

export const authService = {
  async signUp(email, password) {
    const response = await fetch(`${API_BASE_URL}/public/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: APP_ID, email, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('userId', String(data.userId));
    return data;
  },

  async signIn(email, password) {
    const response = await fetch(`${API_BASE_URL}/public/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: APP_ID, email, password }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    await AsyncStorage.setItem('authToken', data.token);
    await AsyncStorage.setItem('userId', String(data.userId));
    return data;
  },

  async signOut() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
  },

  async getToken() {
    return await AsyncStorage.getItem('authToken');
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },
};

export const apiClient = {
  async authenticatedFetch(path, options = {}) {
    const token = await authService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      await authService.signOut();
      throw new Error('Session expired. Please sign in again.');
    }

    return response;
  },

  async getUser() {
    const response = await this.authenticatedFetch('/user');
    return await response.json();
  },
};
```

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

## Testing Authentication

### Testing with cURL

```bash
# Sign up
curl -X POST https://api.example.com/api/public/signup \
  -H "Content-Type: application/json" \
  -d '{"appId": 1, "email": "test@example.com", "password": "SecurePass123!"}'

# Sign in
curl -X POST https://api.example.com/api/public/signin \
  -H "Content-Type: application/json" \
  -d '{"appId": 1, "email": "test@example.com", "password": "SecurePass123!"}'

# Use token for authenticated request
curl -X GET https://api.example.com/api/user \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Testing with Postman

1. **Sign In/Sign Up**:
   - Method: POST
   - URL: `{{baseUrl}}/api/public/signin`
   - Body (JSON):
     ```json
     {
       "appId": 1,
       "email": "test@example.com",
       "password": "password123"
     }
     ```
   - Save the `token` from response

2. **Authenticated Requests**:
   - Add to Headers:
     - Key: `Authorization`
     - Value: `Bearer {{token}}`
   - Or use Postman's "Bearer Token" auth type

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
