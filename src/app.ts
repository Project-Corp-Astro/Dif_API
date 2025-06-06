import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middlewares/error.middleware';
import { captureRawBody } from './middlewares/raw-body.middleware';
import { logger } from './config/logger';

// Import routers
import authRouter from './routes/auth.routes';
import horoscopeRouter from './routes/horoscope.routes';
import reportsRouter from './routes/reports.routes';
import chatRouter from './routes/chat.routes';
import subscriptionRouter from './routes/subscription.routes';
import profileRouter from './routes/profile.routes';

// Create Express app
const app = express();

// Apply middlewares
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses
app.use(captureRawBody); // Capture raw body for webhook signature verification
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logging

// Apply rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/horoscope', horoscopeRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/subscription', subscriptionRouter);
app.use('/api/v1/profile', profileRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

// Error handler
app.use(errorHandler);

export default app;
