# API Architecture and Data Flow

## API Request Lifecycle

The following diagram illustrates the lifecycle of an API request within the A Defection platform:

```
┌──────────────┐
│              │
│    Client    │
│              │
└──────┬───────┘
       │
       │ HTTP Request
       ▼
┌──────────────┐
│              │
│ Express App  │
│              │
└──────┬───────┘
       │
       │
       ▼
┌──────────────┐
│   Security   │
│  Middleware  │ ──────┐
│              │       │
└──────┬───────┘       │ Rate limiting
       │               │ CORS
       │               │ Helmet security
       ▼               │
┌──────────────┐       │
│     Auth     │       │
│  Middleware  │ ──────┘
│              │ 
└──────┬───────┘ JWT verification
       │         Role checking
       │
       ▼
┌──────────────┐
│     API      │
│    Router    │
│              │
└──────┬───────┘
       │
       │
       ▼
┌──────────────┐
│              │
│  Controller  │
│              │
└──────┬───────┘
       │
       │
       ▼
┌──────────────┐
│              │
│   Service    │
│              │
└──────┬───────┘
       │
       │
       ▼
┌──────────────┐
│              │
│    Model     │
│              │
└──────┬───────┘
       │
       │
       ▼
┌──────────────┐
│              │
│   Database   │
│              │
└──────────────┘
```

## Authentication Flow

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│         │    │         │    │         │    │         │    │         │    │         │
│ Client  │───▶│ Express │───▶│  Auth   │───▶│Auth     │───▶│User     │───▶│MongoDB  │
│         │    │ Router  │    │Controller│   │Service  │    │Model    │    │         │
│         │    │         │    │         │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
      │                                           │               │
      │                                           │               │
      │             Login Response                │               │
      │◀─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─│
      │         (JWT Token + User Info)           │               │
      │                                           │               │
      │                                           │               │
      │                                           │               │
      │         Subsequent API Requests           │               │
      │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶│─ ─ ─ ─ ─ ─ ─ ─▶
      │       (Authorization Header with JWT)     │               │
      │                                           │               │
```

## Data Flow Patterns

### 1. Reading Data Flow (GET Request)

```
Client Request (GET /api/narratives/:id)
       │
       ▼
Express Router
       │
       ▼
Auth Middleware (Validates JWT)
       │
       ▼
Narrative Controller (getNarrativeById)
       │
       ▼
Narrative Service (Applies business logic, formats response)
       │
       ▼
Narrative Model (Mongoose query)
       │
       ▼
MongoDB (Retrieves data)
       │
       ▼
Response to Client (JSON data with status code)
```

### 2. Writing Data Flow (POST Request)

```
Client Request (POST /api/narratives)
       │
       ▼
Express Router
       │
       ▼
Security Middleware (Input validation, sanitization)
       │
       ▼
Auth Middleware (Validates JWT, checks permissions)
       │
       ▼
Narrative Controller (createNarrative)
       │
       ▼
Narrative Service (Validation, business logic)
       │
       │
       ├───────────────────┐
       │                   │
       ▼                   ▼
Narrative Model       Activity Service
(Save to database)    (Log user activity)
       │                   │
       ▼                   ▼
MongoDB              Activity Model
(Insert document)     (Save activity)
       │                   │
       └───────────────────┘
       │
       ▼
Response to Client (Success status, created entity)
```

### 3. AI Integration Flow

```
Client Request (POST /api/narratives/generate)
       │
       ▼
Express Router
       │
       ▼
Auth Middleware
       │
       ▼
Narrative Controller (generateNarrative)
       │
       ▼
AI Service (Process request, call OpenAI)
       │
       ▼
OpenAI API (Generate content)
       │
       ▼
AI Service (Process response)
       │
       ▼
Narrative Service (Format and save)
       │
       ▼
Narrative Model (Save to database)
       │
       ▼
Response to Client (Generated narrative)
```

### 4. Prediction Resolution Flow

```
Admin Request (POST /api/predictions/:id/resolve)
       │
       ▼
Express Router
       │
       ▼
Auth Middleware (Verify admin role)
       │
       ▼
Prediction Controller (resolvePrediction)
       │
       ▼
Prediction Service (Validate resolution)
       │
       │
       ├───────────────────┐
       │                   │
       ▼                   ▼
Prediction Model      Blockchain Service
(Update status)       (Calculate rewards)
       │                   │
       ▼                   ▼
MongoDB              Smart Contract
(Update document)     (Distribute tokens)
       │                   │
       └───────────────────┘
       │
       ▼
Response to Admin (Success status)
       │
       │
       │
       ▼
Notification Service (Notify users)
       │
       ▼
Activity Service (Log resolution)
```

## Error Handling Flow

```
Client Request
       │
       ▼
Express Router
       │
       ▼
Request Processing
       │
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
  Normal Flow             Error Occurs
       │                         │
       │                         ▼
       │               Error Thrown (with status)
       │                         │
       │                         ▼
       │               Error Middleware
       │                         │
       │                         ▼
       │               Log Error (development)
       │                         │
       │                         ▼
       │               Format Error Response
       │                         │
       └─────────────────────────┘
       │
       ▼
Response to Client
```

## Rate Limiting Strategy

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Rate Limiter Configuration                        │
│                                                    │
│  ┌─────────────────┐    ┌─────────────────────┐   │
│  │                 │    │                     │   │
│  │ General API:    │    │ Authentication API: │   │
│  │ 100 req/min     │    │ 10 req/min          │   │
│  │                 │    │                     │   │
│  └─────────────────┘    └─────────────────────┘   │
│                                                    │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│                                                    │
│  Incoming Request                                  │
│                                                    │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│                                                    │
│  Rate Limiter Middleware                           │
│                                                    │
│  1. Extract client IP or API key                   │
│  2. Check request count in time window             │
│  3. Increment counter if below limit               │
│  4. Return 429 Too Many Requests if exceeded       │
│                                                    │
└────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────┐
│                                                    │
│  Request Processing                                │
│                                                    │
└────────────────────────────────────────────────────┘
```

## API Endpoints Architecture

The API follows RESTful design principles with resource-oriented endpoints.

### Resource Hierarchy

```
/api
 │
 ├── /auth
 │    ├── /register           POST
 │    ├── /login              POST
 │    ├── /refresh-token      POST
 │    ├── /logout             POST
 │    ├── /forgot-password    POST
 │    ├── /reset-password     POST
 │    ├── /verify-email       GET
 │    ├── /google             GET
 │    └── /twitter            GET
 │
 ├── /users
 │    ├── /me                 GET, PUT, DELETE
 │    ├── /activity           GET
 │    ├── /notifications      GET
 │    ├── /change-password    PUT
 │    └── /:id                GET
 │
 ├── /characters
 │    ├── /                   GET, POST
 │    ├── /user/me            GET
 │    ├── /types              GET
 │    ├── /search             GET
 │    ├── /generate           POST
 │    ├── /:id                GET, PUT, DELETE
 │    ├── /:id/decisions      GET
 │    ├── /:id/predictions    GET
 │    ├── /:id/activities     GET
 │    ├── /:id/narratives     GET
 │    ├── /:id/abilities      POST
 │    └── /:id/mint-nft       POST
 │
 ├── /narratives
 │    ├── /                   GET, POST
 │    ├── /featured           GET
 │    ├── /category/:category GET
 │    ├── /tag/:tag           GET
 │    ├── /search             GET
 │    ├── /generate           POST
 │    ├── /:id                GET, PUT, DELETE
 │    ├── /:id/join           POST
 │    ├── /:id/leave          POST
 │    ├── /:id/characters     GET
 │    ├── /:id/scenes         GET, POST
 │    ├── /:id/decisions      GET
 │    └── /:id/predictions    GET
 │
 ├── /decisions
 │    ├── /                   GET, POST
 │    ├── /user/me            GET
 │    ├── /generate           POST
 │    ├── /:id                GET
 │    ├── /:id/choose         POST
 │    ├── /:id/cancel         POST
 │    ├── /:id/extend         POST
 │    └── /:id/outcomes       GET
 │
 ├── /predictions
 │    ├── /                   GET, POST
 │    ├── /user/me            GET
 │    ├── /trending           GET
 │    ├── /leaderboard        GET
 │    ├── /generate           POST
 │    ├── /:id                GET
 │    ├── /:id/vote           POST
 │    ├── /:id/cancel         POST
 │    ├── /:id/resolve        POST
 │    └── /:id/evidence       GET, POST
 │
 └── /activities
      ├── /                   GET
      ├── /feed               GET
      ├── /narrative/:id      GET
      └── /stats              GET
```

## Authentication and Authorization

### JWT Authentication

```
┌────────────────────────────────────────┐
│                                        │
│               JWT Token                │
│                                        │
│  ┌────────────┐┌────────────┐┌───────┐ │
│  │            ││            ││       │ │
│  │  Header    ││  Payload   ││ Sig.  │ │
│  │            ││            ││       │ │
│  └────────────┘└────────────┘└───────┘ │
│                                        │
└────────────────────────────────────────┘
              │        │
              │        │
              ▼        ▼
     ┌─────────────┐   ┌─────────────┐
     │             │   │             │
     │ Algorithm   │   │  User ID    │
     │ Token Type  │   │  User Role  │
     │             │   │  Issued At  │
     │             │   │  Expires At │
     │             │   │             │
     └─────────────┘   └─────────────┘
```

### Role-Based Authorization

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     Role Authorization Flow                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                Authenticated Request with JWT                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                  Extract User Role from JWT                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    Check Required Roles                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴───────────────┐
                 │                            │
                 ▼                            ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│                           │    │                           │
│     Has Required Role     │    │  Missing Required Role    │
│                           │    │                           │
└───────────────────────────┘    └───────────────────────────┘
                 │                            │
                 ▼                            ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│                           │    │                           │
│     Continue to Route     │    │   Return 403 Forbidden    │
│     Handler               │    │                           │
│                           │    │                           │
└───────────────────────────┘    └───────────────────────────┘
```

## Pagination Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Client Request                             │
│                                                             │
│  GET /api/characters?page=2&limit=10&sortBy=createdAt&      │
│  order=desc&filter[type]=warrior                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Controller                                 │
│                                                             │
│  1. Extract pagination params                               │
│  2. Set defaults if missing                                 │
│  3. Validate parameters                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Query Processing                           │
│                                                             │
│  1. Build filter object                                     │
│  2. Calculate skip value: (page - 1) * limit               │
│  3. Apply sorting                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Database Queries                           │
│                                                             │
│  1. Query for data with limit and skip                      │
│  2. Count total matching documents                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Response                                   │
│                                                             │
│  {                                                          │
│    "data": [ ... ],                                         │
│    "pagination": {                                          │
│      "page": 2,                                             │
│      "limit": 10,                                           │
│      "totalPages": 5,                                       │
│      "totalResults": 48,                                    │
│      "hasNext": true,                                       │
│      "hasPrev": true                                        │
│    }                                                        │
│  }                                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Response Format

```json
{
  "status": "error",
  "message": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific error related to this field"
  },
  "timestamp": "2023-03-23T12:34:56.789Z",
  "path": "/api/resource"
}
```

## Successful Response Format

```json
{
  "status": "success",
  "data": {
    // Resource data or operation result
  },
  "message": "Optional success message"
}
``` 