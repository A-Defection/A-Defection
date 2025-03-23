const { createClient } = require('redis');

/**
 * Redis client instance
 */
let redisClient = null;

/**
 * Connect to Redis server
 */
const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Create Redis client
    redisClient = createClient({
      url: redisUrl,
    });

    // Set up event handlers
    redisClient.on('error', (err) => {
      console.error(`Redis Error: ${err}`);
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis Reconnecting');
    });

    redisClient.on('ready', () => {
      console.log('Redis Ready');
    });

    // Connect to Redis
    await redisClient.connect();

    return redisClient;
  } catch (error) {
    console.error(`Error connecting to Redis: ${error.message}`);
    redisClient = null;
    // Don't exit the process, as Redis might be optional
    return null;
  }
};

/**
 * Get Redis client instance
 * @returns {Object|null} Redis client or null if not connected
 */
const getRedisClient = () => {
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
}; 