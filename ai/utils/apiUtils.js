/**
 * API Utilities
 * 
 * Utility functions for API requests and caching.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache with 10-minute default TTL
const cache = new NodeCache({ stdTTL: 600 });

/**
 * Make a GET request with caching
 * @param {string} url - URL to request
 * @param {Object} params - Query parameters
 * @param {Object} headers - Request headers
 * @param {number} ttl - Cache TTL in seconds (0 to skip cache)
 * @returns {Promise<Object>} - Response data
 */
async function cachedGet(url, params = {}, headers = {}, ttl = 600) {
  try {
    // Generate cache key from URL and params
    const cacheKey = generateCacheKey(url, params);
    
    // Check if cached response exists
    if (ttl > 0) {
      const cachedResponse = cache.get(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Make request
    const response = await axios.get(url, { params, headers });
    
    // Cache response if TTL > 0
    if (ttl > 0) {
      cache.set(cacheKey, response.data, ttl);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error making GET request to ${url}:`, error.message);
    throw error;
  }
}

/**
 * Make a POST request
 * @param {string} url - URL to request
 * @param {Object} data - Request body
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} - Response data
 */
async function post(url, data = {}, headers = {}) {
  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error making POST request to ${url}:`, error.message);
    throw error;
  }
}

/**
 * Generate a cache key from URL and parameters
 * @param {string} url - URL
 * @param {Object} params - Query parameters
 * @returns {string} - Cache key
 */
function generateCacheKey(url, params) {
  return `${url}:${JSON.stringify(params)}`;
}

/**
 * Clear all cache or specific keys
 * @param {string|Array<string>} keys - Specific keys to clear (optional)
 * @returns {boolean} - Success
 */
function clearCache(keys = null) {
  if (!keys) {
    // Clear all cache
    cache.flushAll();
    return true;
  }
  
  // Clear specific keys
  const keyArray = Array.isArray(keys) ? keys : [keys];
  keyArray.forEach(key => cache.del(key));
  return true;
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
function getCacheStats() {
  return {
    keys: cache.keys(),
    stats: cache.getStats(),
    size: cache.keys().length
  };
}

/**
 * Rate limiting helper - returns whether a request should proceed
 * @param {string} key - Rate limit key (e.g., 'user:123', 'ip:192.168.1.1')
 * @param {number} limit - Maximum requests in period
 * @param {number} period - Period in seconds
 * @returns {boolean} - Whether request should proceed
 */
function rateLimit(key, limit, period = 60) {
  const rateKey = `rate:${key}`;
  
  // Get current counts
  const current = cache.get(rateKey) || { count: 0, reset: Date.now() + (period * 1000) };
  
  // Check if period has expired
  if (Date.now() > current.reset) {
    // Reset counter
    current.count = 1;
    current.reset = Date.now() + (period * 1000);
    cache.set(rateKey, current, period);
    return true;
  }
  
  // Increment counter
  current.count += 1;
  cache.set(rateKey, current, Math.ceil((current.reset - Date.now()) / 1000));
  
  // Check if over limit
  return current.count <= limit;
}

module.exports = {
  cachedGet,
  post,
  clearCache,
  getCacheStats,
  rateLimit
};