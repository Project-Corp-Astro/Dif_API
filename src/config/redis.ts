import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

// Create Redis client
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Handle Redis events
redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

export default redis;
