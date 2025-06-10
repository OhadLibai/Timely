// timely/backend/src/config/redis.config.ts
import { createClient } from 'redis';
import logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('connect', () => {
  logger.info('Connecting to Redis...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected successfully.');
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});