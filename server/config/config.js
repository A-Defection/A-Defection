/**
 * Server Configuration
 * 
 * Centralizes configuration settings for the application
 */

const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '../../.env')
});

// Environment
const env = process.env.NODE_ENV || 'development';

// Configuration object
const config = {
  // Environment
  env,
  
  // Server
  port: process.env.PORT || 5000,
  
  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/a-defection',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'very-secret-key-for-development-only',
    accessExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d'
  },
  
  // Cookie
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-key',
    options: {
      httpOnly: true,
      secure: env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  },
  
  // CORS
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    from: process.env.EMAIL_FROM || 'no-reply@a-defection.com'
  },
  
  // OAuth
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    },
    twitter: {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackUrl: process.env.TWITTER_CALLBACK_URL
    }
  },
  
  // AI Services
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    }
  },
  
  // Blockchain
  blockchain: {
    provider: process.env.BLOCKCHAIN_PROVIDER,
    contractAddress: process.env.CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY
  }
};

module.exports = config; 