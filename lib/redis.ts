import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Graceful connection with retry strategy
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by bullmq
  retryStrategy: (times) => {
    // Exponential backoff
    return Math.min(times * 50, 2000);
  },
});

redis.on('error', (error) => {
  console.error('[Redis] Connection Error:', error.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected gracefully.');
});

export default redis;
