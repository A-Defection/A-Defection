# System Architecture

## High-Level System Architecture

The A Defection platform is built using a layered architecture pattern, with clear separation of concerns between different system components. The diagram below illustrates the high-level architecture of the system:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                           CLIENT APPLICATIONS                             │
│                                                                           │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐        │
│   │               │      │               │      │               │        │
│   │  Web Client   │      │ Mobile Client │      │  Admin Panel  │        │
│   │  (React.js)   │      │ (React Native)│      │               │        │
│   │               │      │               │      │               │        │
│   └───────────────┘      └───────────────┘      └───────────────┘        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTPS/REST/WebSockets
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                            API GATEWAY LAYER                              │
│                                                                           │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐        │
│   │               │      │               │      │               │        │
│   │   Security    │      │ API Routing   │      │ Rate Limiting │        │
│   │  Middleware   │      │               │      │               │        │
│   │               │      │               │      │               │        │
│   └───────────────┘      └───────────────┘      └───────────────┘        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
┌───────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│                   │   │                  │   │                  │
│   AUTH SERVICE    │   │   CORE SERVICES  │   │   AI SERVICES    │
│                   │   │                  │   │                  │
│ ┌───────────────┐ │   │ ┌──────────────┐ │   │ ┌──────────────┐ │
│ │ Registration  │ │   │ │   Narrative  │ │   │ │   Narrative  │ │
│ │ & Login       │ │   │ │   Service    │ │   │ │   Generation │ │
│ └───────────────┘ │   │ └──────────────┘ │   │ └──────────────┘ │
│                   │   │                  │   │                  │
│ ┌───────────────┐ │   │ ┌──────────────┐ │   │ ┌──────────────┐ │
│ │ Token         │ │   │ │  Character   │ │   │ │ News Analysis│ │
│ │ Management    │ │   │ │  Service     │ │   │ │              │ │
│ └───────────────┘ │   │ └──────────────┘ │   │ └──────────────┘ │
│                   │   │                  │   │                  │
│ ┌───────────────┐ │   │ ┌──────────────┐ │   │ ┌──────────────┐ │
│ │ Authorization │ │   │ │  Decision    │ │   │ │  Prediction  │ │
│ │               │ │   │ │  Service     │ │   │ │  Evaluation  │ │
│ └───────────────┘ │   │ └──────────────┘ │   │ └──────────────┘ │
│                   │   │                  │   │                  │
└───────────────────┘   └──────────────────┘   └──────────────────┘
                ▲                 ▲                 ▲
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                           DATA ACCESS LAYER                               │
│                                                                           │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐        │
│   │               │      │               │      │               │        │
│   │  MongoDB      │      │  Redis Cache  │      │  Blockchain   │        │
│   │  Database     │      │  (Optional)   │      │  Integration  │        │
│   │               │      │               │      │               │        │
│   └───────────────┘      └───────────────┘      └───────────────┘        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Client Applications

1. **Web Client**: Primary interface built with React.js, providing a responsive web experience for desktop and mobile browsers.
2. **Mobile Client**: (Future) Native mobile experience built with React Native.
3. **Admin Panel**: Administrative interface for content moderation, user management, and system monitoring.

### API Gateway Layer

1. **Security Middleware**: 
   - Implements CORS, Helmet for HTTP headers
   - Authentication verification
   - Input validation and sanitization
   
2. **API Routing**:
   - Routes requests to appropriate microservices
   - Centralizes endpoint management
   - Handles API versioning

3. **Rate Limiting**:
   - Prevents abuse and DOS attacks
   - Configurable limits per endpoint
   - IP-based and user-based limiting strategies

### Service Layer

1. **Auth Service**:
   - User registration and login
   - JWT token generation and validation
   - OAuth integration (Google, Twitter)
   - Password reset and email verification

2. **Core Services**:
   - **Narrative Service**: Manages story creation, updates, and progression
   - **Character Service**: Handles character creation, customization, and abilities
   - **Decision Service**: Processes user choices and narrative branching
   - **Prediction Service**: Manages forecasts and outcome verification
   - **Activity Service**: Logs user actions and generates activity feeds

3. **AI Services**:
   - **Narrative Generation**: Creates dynamic storylines based on news events
   - **News Analysis**: Processes real-world news for narrative integration
   - **Prediction Evaluation**: Assesses prediction accuracy based on real-world outcomes
   - **Character Generation**: Creates AI-powered NPCs for narrative participation

### Data Access Layer

1. **MongoDB Database**:
   - Primary data store using Mongoose ODM
   - Stores users, narratives, characters, decisions, and predictions
   - Implements data validation and schema enforcement

2. **Redis Cache** (Optional):
   - Caches frequently accessed data
   - Improves performance for high-traffic endpoints
   - Stores session data and rate limiting counters

3. **Blockchain Integration**:
   - Connects to Ethereum/Polygon networks
   - Manages token transactions and NFT minting
   - Verifies on-chain ownership of digital assets

## Communication Patterns

### Synchronous Communication
- REST API for primary client-server interaction
- GraphQL for complex data queries (future implementation)

### Asynchronous Communication
- WebSockets for real-time updates (future implementation)
- Event-driven architecture for internal service communication

## Security Architecture

1. **Authentication**:
   - JWT-based token authentication
   - Secure cookie storage
   - OAuth 2.0 integration

2. **Authorization**:
   - Role-based access control
   - Attribute-based permissions
   - Resource ownership verification

3. **Data Protection**:
   - HTTPS for all communications
   - Sensitive data encryption
   - Input validation and sanitization

## Scalability Considerations

The architecture supports horizontal scaling through:

1. **Stateless Services**: All services are designed to be stateless, allowing for easy replication
2. **Database Sharding**: MongoDB supports sharding for distributed data storage
3. **Microservice Isolation**: Each service can be scaled independently based on load
4. **Caching Strategy**: Implementing Redis reduces database load for read-heavy operations

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                        LOAD BALANCER                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                               │
           ┌──────────────────┴───────────────────┐
           │                                      │
           ▼                                      ▼
┌────────────────────────┐            ┌────────────────────────┐
│                        │            │                        │
│    API SERVER POOL     │            │   STATIC ASSETS CDN    │
│                        │            │                        │
└────────────────────────┘            └────────────────────────┘
           │                                      │
           └──────────────────┬───────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                       DATABASE CLUSTER                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

This architecture supports deployment to various environments:

1. **Development**: Local development setup with Docker Compose
2. **Staging**: Cloud-based testing environment for QA
3. **Production**: Fully scaled deployment with redundancy and load balancing 