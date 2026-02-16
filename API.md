# API Documentation

## Overview

The HabitFlow Authentication Service provides a RESTful API for user authentication, profile management, and Google Calendar integration. All endpoints follow REST conventions and return JSON responses.

**Base URL**: `http://localhost:3000/api/v1`

**Interactive Documentation**: When the server is running, visit `http://localhost:3000/api/v1/docs` for the complete Swagger UI interface with interactive API testing.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After successful login or registration, the server returns:
- **Access Token**: Short-lived token (1 hour) for API requests
- **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens

Tokens are returned in the response body and can be stored client-side. Include the access token in the `Authorization` header for protected endpoints:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  // ... other fields
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Endpoints

### Authentication

#### Register New User
**POST** `/api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "name": "John Doe"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character
- `confirmPassword`: Must match password
- `name`: 2-100 characters

**Success Response (201 Created):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "googleCalendarConnected": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation failed
- `409 Conflict`: Email already registered

---

#### Login
**POST** `/api/v1/auth/login`

Authenticate user and receive tokens.

**Rate Limit**: 5 attempts per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200 OK):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "googleCalendarConnected": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account locked (too many failed attempts)
- `429 Too Many Requests`: Rate limit exceeded

---

#### Refresh Token
**POST** `/api/v1/auth/refresh`

Obtain a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token
- `403 Forbidden`: Token has been blacklisted

---

#### Logout
**POST** `/api/v1/auth/logout`

Invalidate current tokens and log out user.

**Authentication**: Required (Bearer token)

**Request Body:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

#### Get Current User
**GET** `/api/v1/auth/me`

Retrieve authenticated user's information.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "googleCalendarConnected": true,
  "selectedCalendarId": "primary",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### Google OAuth Integration

#### Initiate Google OAuth Flow
**GET** `/api/v1/auth/google`

Redirects user to Google's OAuth consent screen.

**Query Parameters:**
- None

**Response**: 302 Redirect to Google OAuth

---

#### Google OAuth Callback
**GET** `/api/v1/auth/google/callback`

Handles OAuth callback from Google. This endpoint is called automatically by Google after user consent.

**Query Parameters:**
- `code`: Authorization code (provided by Google)
- `state`: CSRF protection token (provided by Google)

**Response**: 302 Redirect to frontend with tokens in URL or cookies

---

#### Get Google Calendar Connection Status
**GET** `/api/v1/auth/google/status`

Check if user has connected their Google Calendar.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "connected": true,
  "selectedCalendarId": "primary",
  "selectedCalendarName": "John's Calendar"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

#### List Google Calendars
**GET** `/api/v1/auth/google/calendars`

Retrieve list of user's Google Calendars.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "calendars": [
    {
      "id": "primary",
      "summary": "John's Calendar",
      "description": "Primary calendar",
      "timeZone": "America/New_York",
      "primary": true
    },
    {
      "id": "work@example.com",
      "summary": "Work Calendar",
      "timeZone": "America/New_York",
      "primary": false
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Google Calendar not connected

---

#### Select Calendar
**POST** `/api/v1/auth/google/calendar/select`

Select which Google Calendar to use for habit tracking.

**Authentication**: Required (Bearer token)

**Request Body:**
```json
{
  "calendarId": "primary"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Calendar selected successfully",
  "calendarId": "primary"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Invalid calendar ID or Google Calendar not connected

---

#### Disconnect Google Calendar
**POST** `/api/v1/auth/google/disconnect`

Disconnect user's Google Calendar integration.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "message": "Google Calendar disconnected successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### User Management

#### Get User Profile
**GET** `/api/v1/users/me`

Retrieve authenticated user's detailed profile.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "googleCalendarConnected": true,
  "selectedCalendarId": "primary",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

#### Update User Profile
**PUT** `/api/v1/users/me`

Update authenticated user's profile information.

**Authentication**: Required (Bearer token)

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "newemail@example.com"
}
```

**Validation Rules:**
- `name`: Optional, 2-100 characters
- `email`: Optional, valid email format, unique

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newemail@example.com",
  "name": "John Smith",
  "googleCalendarConnected": true,
  "selectedCalendarId": "primary",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:45:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `400 Bad Request`: Validation failed
- `409 Conflict`: Email already in use

---

#### Delete User Account
**DELETE** `/api/v1/users/me`

Permanently delete authenticated user's account and all associated data.

**Authentication**: Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "message": "User account deleted successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

---

### Health Check

#### Service Health Status
**GET** `/api/v1/health`

Check if the service is running and healthy.

**Success Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

## Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions, or account locked |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

## Rate Limiting

Rate limits protect against abuse:

- **Login endpoint**: 5 attempts per 15 minutes per IP
- **Global rate limit**: 100 requests per minute per IP

When rate limited, the response includes:
```json
{
  "statusCode": 429,
  "message": "Too Many Requests",
  "error": "ThrottlerException"
}
```

## Security

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

### Token Security
- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
- Tokens are invalidated on logout
- Tokens are stored in Redis and checked for blacklisting

### CSRF Protection
State-changing requests (POST, PUT, DELETE) require CSRF token validation. The token is automatically handled if using cookie-based authentication.

## Examples

### Complete Authentication Flow

**1. Register:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "name": "John Doe"
  }'
```

**2. Use Access Token:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**3. Refresh Token (when access token expires):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**4. Logout:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Google Calendar Integration Flow

**1. Initiate OAuth (in browser):**
```
http://localhost:3000/api/v1/auth/google
```

**2. After OAuth callback, check status:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/google/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**3. List calendars:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/google/calendars \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**4. Select calendar:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/google/calendar/select \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "calendarId": "primary"
  }'
```

## Swagger UI

For interactive API exploration and testing, visit:
**http://localhost:3000/api/v1/docs**

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schema details
- Interactive "Try it out" functionality
- Authentication token management
- Example values for all DTOs

## Support

For questions or issues:
- Check the [README.md](./README.md) for setup instructions
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Open an issue on GitHub for bugs or feature requests
