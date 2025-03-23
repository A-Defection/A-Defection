# Authentication API

The Authentication API handles user registration, login, token management, and account verification.

## Base URL

All authentication endpoints are relative to the base URL:

```
https://api.adefection.com/api/auth
```

## Endpoints

### Register User

Creates a new user account.

```
POST /register
```

#### Request Body

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

#### Response

```json
{
  "status": "success",
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "_id": "614a5bfcef9a243cdba8976c",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": false,
      "createdAt": "2023-09-21T12:34:56.789Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

Authenticates a user and returns a JWT token.

```
POST /login
```

#### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "614a5bfcef9a243cdba8976c",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": true,
      "lastLogin": "2023-09-21T14:23:45.678Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout

Invalidates the current user's token.

```
POST /logout
```

#### Headers

```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response

```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### Get Current User

Returns the currently authenticated user's information.

```
GET /me
```

#### Headers

```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Response

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "614a5bfcef9a243cdba8976c",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "role": "user",
      "isVerified": true,
      "bio": "A passionate narrative enthusiast",
      "createdAt": "2023-09-21T12:34:56.789Z",
      "metrics": {
        "characterCount": 3,
        "decisionsCount": 25,
        "predictionsCount": 12,
        "predictionsCorrect": 9,
        "narrativesCreated": 1,
        "lastActive": "2023-09-22T10:15:20.123Z"
      }
    }
  }
}
```

### Verify Email

Verifies a user's email address using the token sent during registration.

```
GET /verify-email/:token
```

#### Parameters

| Name  | Type   | Description                |
|-------|--------|----------------------------|
| token | string | Email verification token   |

#### Response

```json
{
  "status": "success",
  "message": "Email verified successfully",
  "data": {
    "isVerified": true
  }
}
```

### Request Password Reset

Sends a password reset email to the user.

```
POST /forgot-password
```

#### Request Body

```json
{
  "email": "john.doe@example.com"
}
```

#### Response

```json
{
  "status": "success",
  "message": "Password reset email sent"
}
```

### Reset Password

Resets the user's password using a reset token.

```
POST /reset-password/:token
```

#### Parameters

| Name  | Type   | Description                |
|-------|--------|----------------------------|
| token | string | Password reset token       |

#### Request Body

```json
{
  "password": "newSecurePassword456",
  "confirmPassword": "newSecurePassword456"
}
```

#### Response

```json
{
  "status": "success",
  "message": "Password reset successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Refresh Token

Gets a new access token using a refresh token.

```
POST /refresh-token
```

#### Request Body

```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}
```

#### Response

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "newRefreshToken123..."
  }
}
```

### Change Password

Changes the password for an authenticated user.

```
PUT /change-password
```

#### Headers

```
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Request Body

```json
{
  "currentPassword": "securePassword123",
  "newPassword": "evenMoreSecurePassword789",
  "confirmNewPassword": "evenMoreSecurePassword789"
}
```

#### Response

```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

### OAuth Authentication

#### Google OAuth Login

```
GET /google
```

Redirects to Google authentication.

#### Google OAuth Callback

```
GET /google/callback
```

Handles the OAuth callback from Google and returns a JWT token.

#### Twitter OAuth Login

```
GET /twitter
```

Redirects to Twitter authentication.

#### Twitter OAuth Callback

```
GET /twitter/callback
```

Handles the OAuth callback from Twitter and returns a JWT token.

## Error Responses

### Invalid Credentials

```json
{
  "status": "error",
  "message": "Invalid email or password",
  "code": "AUTH_INVALID_CREDENTIALS"
}
```

### Unverified Account

```json
{
  "status": "error",
  "message": "Please verify your email before logging in",
  "code": "AUTH_EMAIL_NOT_VERIFIED"
}
```

### Token Expired

```json
{
  "status": "error",
  "message": "Token has expired",
  "code": "AUTH_TOKEN_EXPIRED"
}
```

### Invalid Token

```json
{
  "status": "error",
  "message": "Invalid token",
  "code": "AUTH_INVALID_TOKEN"
}
```

### Validation Errors

```json
{
  "status": "error",
  "message": "Validation failed",
  "code": "AUTH_VALIDATION_ERROR",
  "details": {
    "password": "Password must be at least 8 characters with at least one number, one uppercase and one lowercase letter"
  }
}
``` 