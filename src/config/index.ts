import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Supabase configuration
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Redis configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // CORS configuration
  corsOrigins: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:3000', 'exp://localhost:19000'],
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // Limit each IP to 100 requests per windowMs
  },
  
  // Subscription plans
  subscriptionPlans: {
    monthly: process.env.MONTHLY_PLAN_ID || 'monthly_subscription',
    yearly: process.env.YEARLY_PLAN_ID || 'yearly_subscription',
    lifetime: process.env.LIFETIME_PLAN_ID || 'lifetime_subscription',
  },
  
  // Astro Engine API (for horoscope integration)
  astroEngineUrl: process.env.ASTRO_ENGINE_URL || 'https://api.astroengine.com',
  astroEngineKey: process.env.ASTRO_ENGINE_KEY || '',
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET'
];

// In production, ensure all required env vars are set
if (config.nodeEnv === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
