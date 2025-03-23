<p align="center">
  <img src="assets/images/logo.svg" alt="A Defection Logo" width="300">
</p>

# A Defection

An interactive narrative platform connecting stories to real-world events. The platform allows users to create and interact with narratives, make decisions, and predict outcomes based on real-world news.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Key Components](#key-components)
- [API Structure](#api-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

A Defection is an AI-powered platform that transforms real-world news into interactive narratives where users make decisions as characters in a dynamically evolving story world. The platform uses advanced AI to analyze global news, generate personalized narratives, and reward users for accurate predictions of real-world events.

## System Architecture

The system follows a microservices-oriented architecture with clear separation of concerns:

```
                                +----------------+
                                |                |
                                |  Client Layer  |
                                |                |
                                +-------+--------+
                                        |
                                        v
                        +---------------+---------------+
                        |                               |
                        |       API Gateway Layer       |
                        |                               |
                        +-+----------+----------+------++
                          |          |          |      |
         +----------------v--+     +-v----------v-+   +v---------------+
         |                   |     |              |   |                |
         |  Auth Services    |     |  Core API    |   |  AI Services   |
         |                   |     |  Services    |   |                |
         +----------------+--+     +-+----------+-+   +----------------+
                          |          |          |
                          |          |          |
                 +--------v----------v----------v--------+
                 |                                        |
                 |           Database Layer               |
                 |                                        |
                 +--------+-------------------------+-----+
                          |                         |
                          |                         |
                 +--------v-------+       +---------v------+
                 |                |       |                |
                 |   MongoDB      |       |   Blockchain   |
                 |                |       |                |
                 +----------------+       +----------------+
```

For detailed architecture information, see the [Architecture Documentation](docs/architecture/index.md).

## Technology Stack

### Backend
- **Runtime Environment**: Node.js
- **API Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, OAuth 2.0 (Google, Twitter)
- **Security**: Helmet, CORS, Rate Limiting
- **Real-time Communication**: Socket.io (for future implementation)
- **Caching**: Redis (optional, for future implementation)

### Frontend
- **Framework**: React.js
- **State Management**: Redux or Context API
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **API Communication**: Axios

### AI Integration
- **Natural Language Processing**: OpenAI API
- **Content Generation**: Custom narrative generation models
- **Event Analysis**: News processing pipeline

### Blockchain
- **Network**: Ethereum/Polygon
- **Smart Contracts**: Solidity
- **Client Library**: ethers.js

## Data Flow

```
 +--------------+    +--------------+    +--------------+    +--------------+
 | User Actions |    | API Request  |    | Controller   |    | Service      |
 | (Frontend)   +--->| Processing   +--->| Layer        +--->| Layer        |
 |              |    |              |    |              |    |              |
 +--------------+    +--------------+    +--------------+    +------+-------+
                                                                   |
 +--------------+    +--------------+    +--------------+          |
 | Response     |    | Data         |    | Database     |          |
 | to Client    |<---+ Formatting   |<---+ Operations   |<---------+
 |              |    |              |    |              |
 +--------------+    +--------------+    +--------------+
```

For detailed data flow information, see the [API Flow Documentation](docs/architecture/api_flow.md).

## Key Components

### Data Models

The system's core entities and their relationships:

```
+---------+     +-----------+     +----------+
| User    |<--->| Character |<--->| Narrative|
+---------+     +-----------+     +----------+
     |               |                |
     v               v                v
+---------+     +-----------+     +----------+
|Activity |     | Decision  |     |Prediction|
+---------+     +-----------+     +----------+
     ^               |                |
     |               v                v
     +------<--------+-------<--------+
```

For detailed data model information, see the [Data Models Documentation](docs/architecture/data_models.md).

### AI System

The AI subsystem includes various specialized components:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                        NARRATIVE MASTERMIND                              │
│                     (Central AI Coordination Layer)                      │
│                                                                          │
└─────────────┬──────────────────┬───────────────────┬────────────────────┘
              │                  │                   │
              ▼                  ▼                   ▼
┌─────────────────────┐ ┌─────────────────┐ ┌────────────────────┐
│                     │ │                 │ │                    │
│   News Analysis     │ │   Narrative     │ │    Character       │
│       Engine        │ │   Generator     │ │    Simulator       │
│                     │ │                 │ │                    │
└─────────────────────┘ └─────────────────┘ └────────────────────┘
```

For detailed AI integration information, see the [AI Integration Documentation](docs/architecture/ai_integration.md).

### Blockchain Integration

The blockchain integration provides tokenization and digital ownership features:

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                   BLOCKCHAIN SERVICE LAYER                     │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │                 │  │                 │  │                 ││
│  │  Token Service  │  │   NFT Service   │  │ Prediction      ││
│  │                 │  │                 │  │ Market Service  ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                               │
└───────────────────────────────┬───────────────────────────────┘
```

For detailed blockchain integration information, see the [Blockchain Integration Documentation](docs/architecture/blockchain_integration.md).

## API Structure

The API is organized into logical resource groups:

```
/api
├── /auth           # Authentication endpoints
├── /users          # User profile management
├── /characters     # Character creation and management
├── /narratives     # Story creation and interaction
├── /decisions      # Choice processing
├── /predictions    # Forecast management
├── /activities     # Action logs and feeds
└── /blockchain     # Token and NFT operations
```

For detailed API documentation, see the [API Documentation](docs/api/index.md).

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- NPM or Yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/a-defection.git
cd a-defection
```

2. Install dependencies:

```bash
npm run install-all
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration values.

4. Run the development server:

```bash
npm run dev-full
```

This will start both the backend server and the frontend client in development mode.

For detailed setup instructions, see the [Development Setup Guide](docs/development/setup.md).

## Environment Configuration

The application requires several environment variables for proper operation:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/a-defection
MONGODB_TEST_URI=mongodb://localhost:27017/a-defection-test

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=24h
JWT_COOKIE_EXPIRE=30

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email_username
SMTP_PASSWORD=your_email_password
FROM_EMAIL=noreply@yourapp.com
FROM_NAME=A Defection

# AI Configuration
OPENAI_API_KEY=your_openai_api_key

# Blockchain Configuration
WEB3_PROVIDER_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=your_contract_address
```

## Deployment

### Production Deployment

For production deployment, we recommend:

1. Set up a MongoDB Atlas cluster
2. Deploy the backend to a Node.js hosting service (Heroku, DigitalOcean, AWS)
3. Deploy the frontend to a static hosting service (Netlify, Vercel)
4. Configure environment variables for production
5. Set up CI/CD pipeline for automated deployment

For detailed deployment instructions, see the [Deployment Guide](docs/deployment/index.md).

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 