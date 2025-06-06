import { Server } from 'socket.io';
import { logger } from '../config/logger';
import { initChatNamespace } from './chat.socket';

/**
 * Initialize Socket.IO server and register all namespaces
 * @param io The Socket.IO server instance
 */
export const initSocketServer = (io: Server): void => {
  // Register middleware for all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // Verify token (simplified - implement proper JWT verification)
    try {
      // Attach user data to socket for use in handlers
      socket.data.user = { id: 'user-id' }; // Replace with actual user data from token
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Initialize namespaces
  initChatNamespace(io.of('/chat'));

  // Handle connection to main namespace
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    logger.info(`User connected: ${userId}`);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userId}`);
    });
  });

  logger.info('Socket.IO server initialized');
};
