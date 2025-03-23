# Development Environment Setup

This guide provides step-by-step instructions for setting up a development environment for the A Defection platform.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v7 or higher) or **Yarn** (v1.22 or higher)
- **MongoDB** (v4.4 or higher)
- **Git**
- **Docker** (optional, for containerized development)
- **Ethereum development tools** (optional, for blockchain features)

## Repository Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/a-defection.git
cd a-defection
```

2. Install dependencies:

```bash
# Install all dependencies (backend and frontend)
npm run install-all

# Or if you prefer to install them separately
npm install        # Server dependencies
cd client
npm install        # Client dependencies
cd ..
```

## Environment Configuration

1. Create environment files:

```bash
# Copy the example environment file
cp .env.example .env
```

2. Update the `.env` file with your local configuration:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/a-defection
MONGODB_TEST_URI=mongodb://localhost:27017/a-defection-test

# JWT Authentication
JWT_SECRET=your_local_jwt_secret_key
JWT_EXPIRE=24h
JWT_COOKIE_EXPIRE=30

# AI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key

# Blockchain Configuration (optional)
WEB3_PROVIDER_URL=http://localhost:8545
```

## Database Setup

1. Start MongoDB:

```bash
# If MongoDB is installed locally
mongod

# If using Docker
docker run --name mongodb -p 27017:27017 -d mongo:latest
```

2. Initialize the database (optional):

```bash
# This will create initial data for development
npm run db:seed
```

## Running the Application

### Development Mode

To run both the server and client in development mode with hot reloading:

```bash
npm run dev-full
```

This will start:
- Backend server on http://localhost:5000
- Frontend client on http://localhost:3000

### Running Components Separately

To run the server and client separately:

```bash
# Run the server
npm run dev

# In another terminal, run the client
cd client
npm start
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests
npm run test:server

# Run frontend tests
npm run test:client

# Run a specific test file
npm test -- server/tests/auth.test.js
```

### Linting

```bash
# Lint all code
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

## Docker Development Environment

For containerized development:

1. Build and start the containers:

```bash
docker-compose up -d
```

2. Stop the containers:

```bash
docker-compose down
```

## Blockchain Development (Optional)

For local blockchain development:

1. Install Hardhat:

```bash
cd blockchain
npm install
```

2. Start a local blockchain node:

```bash
npx hardhat node
```

3. Deploy contracts to the local network:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

## Accessing the Application

- **API**: http://localhost:5000/api
- **Frontend**: http://localhost:3000
- **API Documentation**: http://localhost:5000/api-docs

## Common Issues and Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection issues, make sure:

1. MongoDB service is running
2. The connection URI in `.env` is correct
3. Network settings allow connection to the MongoDB port

### Node.js Version Conflicts

The project requires Node.js v14 or higher. If you have multiple versions installed, use nvm to switch:

```bash
nvm use 14
```

### Port Already in Use

If ports 3000 or 5000 are already in use:

1. Change the port in the `.env` file for the backend
2. For the frontend, you can start it with a different port:

```bash
cd client
PORT=3001 npm start
```

## Next Steps

After setting up your development environment, you might want to:

1. Explore the [API Documentation](../api/index.md)
2. Review the [Architecture Documentation](../architecture/index.md)
3. Check out the [Contributing Guidelines](../../CONTRIBUTING.md)
4. Start working on [open issues](https://github.com/yourusername/a-defection/issues) 