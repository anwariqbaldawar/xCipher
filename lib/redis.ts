import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Graceful connection with retry strategy
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by bullmq
  retryStrategy: (times) => {
    // In development, stop retrying after 3 attempts to prevent infinite spam
    if (process.env.NODE_ENV === 'development' && times > 3) {
      console.warn('[Redis] Max retries reached in dev mode. Giving up on connection.');
      return null; // Stop retrying
    }
    // Exponential backoff
    return Math.min(times * 50, 2000);
  },
});

let errorLogged = false;
redis.on('error', (error: any) => {
  if (process.env.NODE_ENV === 'development' && error.code === 'ECONNREFUSED') {
    if (!errorLogged) {
      console.error('[Redis] Connection Refused: Is Redis running locally on port 6379?');
      errorLogged = true;
    }
  } else {
    console.error('[Redis] Connection Error:', error.message);
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected gracefully.');
});

export default redis;
