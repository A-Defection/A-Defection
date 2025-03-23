# A Defection API Documentation

This documentation provides comprehensive information about the A Defection platform API.

## API Overview

The A Defection API is a RESTful interface that allows developers to interact with the platform's core functionality. The API is organized around resource-oriented URLs, accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes.

## Base URL

All API endpoints are relative to the base URL:

```
https://api.adefection.com/api
```

For development and testing environments:

```
Development: https://dev-api.adefection.com/api
Testing: https://test-api.adefection.com/api
Local: http://localhost:5000/api
```

## Authentication

Most API endpoints require authentication using JSON Web Tokens (JWT). To authenticate, include the JWT in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

To obtain a JWT token, use the [authentication endpoints](./auth.md).

## Rate Limiting

The API implements rate limiting to prevent abuse. Rate limits vary by endpoint:

- **General API routes**: 100 requests per minute
- **Authentication routes**: 10 requests per minute

When a rate limit is exceeded, the API returns a `429 Too Many Requests` response.

## API Endpoints

The API is organized into the following resource groups:

- [Authentication](./auth.md): User registration, login, token management
- [Users](./users.md): User profile management, notifications, activities
- [Characters](./characters.md): Character creation, customization, abilities
- [Narratives](./narratives.md): Story creation, progression, participation
- [Decisions](./decisions.md): Character decision-making, outcomes
- [Predictions](./predictions.md): Event predictions, resolution, rewards
- [Activities](./activities.md): Action logging, feed generation

## Common Request Parameters

### Pagination

For endpoints that return collections of resources, pagination is supported with the following parameters:

- `page`: The page number to retrieve (default: 1)
- `limit`: The number of items per page (default: 10, max: 100)

Example:

```
GET /api/characters?page=2&limit=20
```

### Sorting

For endpoints that return collections, sorting is supported with the following parameters:

- `sortBy`: The field to sort by
- `order`: The sort order (`asc` or `desc`, default: `desc`)

Example:

```
GET /api/narratives?sortBy=createdAt&order=desc
```

### Filtering

Many endpoints support filtering using query parameters:

Example:

```
GET /api/predictions?status=active&category=politics
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "status": "success",
  "data": {
    // Resource data or operation result
  },
  "pagination": {
    // Pagination details (if applicable)
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "totalResults": 48
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details (if applicable)
  }
}
```

## HTTP Status Codes

The API uses standard HTTP status codes:

- `200 OK`: The request was successful
- `201 Created`: The resource was successfully created
- `400 Bad Request`: The request was invalid
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user lacks permission
- `404 Not Found`: The requested resource was not found
- `409 Conflict`: The request conflicts with the current state
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: An unexpected error occurred

## API Versioning

The API version is included in the base URL path. The current version is `v1`:

```
https://api.adefection.com/api/v1
```

## SDK and Client Libraries

Official client libraries are available for popular programming languages:

- JavaScript/TypeScript: [adefection-js](https://github.com/adefection/adefection-js)
- Python: [adefection-python](https://github.com/adefection/adefection-python)

## API Changelog

For information about API changes and updates, see the [API Changelog](./changelog.md). 