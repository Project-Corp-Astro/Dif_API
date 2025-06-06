import pino from 'pino';
import { config } from './index';

// Configure logger based on environment
const loggerConfig = {
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  transport: config.nodeEnv !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } 
    : undefined,
};

export const logger = pino(loggerConfig);
