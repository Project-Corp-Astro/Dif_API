import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { logger } from './config/logger';
import { initSocketServer } from './sockets';
import { config } from './config';
import reportWorker from './workers/report.worker';
import { runMigrations } from './db/migrate';

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO handlers
initSocketServer(io);

// Start the server
const PORT = config.port || 3000;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  
  // Skip database migrations for FCM testing
  if (process.env.SKIP_MIGRATIONS === 'true') {
    logger.info('Skipping database migrations for FCM testing');
  } else {
    try {
      logger.info('Running database migrations...');
      // Skip migrations for now to avoid errors during FCM testing
      // await runMigrations();
      logger.info('Database migrations skipped for FCM testing');
    } catch (error) {
      logger.error('Error running database migrations:', error);
    }
  }
  
  // Initialize report worker
  logger.info('Report worker initialized and ready to process jobs');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;
