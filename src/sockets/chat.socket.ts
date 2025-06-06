import { Namespace } from 'socket.io';
import { logger } from '../config/logger';
import { saveChatMessage } from '../services/chat.service';

/**
 * Initialize the chat namespace for Socket.IO
 * @param namespace The Socket.IO namespace for chat
 */
export const initChatNamespace = (namespace: Namespace): void => {
  namespace.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    logger.info(`User connected to chat: ${userId}`);

    // Join user to their personal room for targeted messages
    socket.join(`user:${userId}`);

    // Handle new chat message
    socket.on('message', async (data) => {
      try {
        const { message } = data;
        
        // Save message to database
        const savedMessage = await saveChatMessage({
          userId,
          message,
          timestamp: new Date()
        });
        
        // Emit message to user
        socket.emit('message', savedMessage);
        
        // Process message with AI and send response
        // This would integrate with your AI service
        setTimeout(() => {
          const aiResponse = {
            id: `ai-${Date.now()}`,
            text: `This is an AI response to: "${message}"`,
            sender: 'ai',
            timestamp: new Date()
          };
          
          socket.emit('message', aiResponse);
        }, 1000);
      } catch (error) {
        logger.error('Error handling chat message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { isTyping } = data;
      // Broadcast typing status to relevant users
      socket.broadcast.to(`user:${userId}`).emit('typing', { userId, isTyping });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected from chat: ${userId}`);
    });
  });

  logger.info('Chat namespace initialized');
};
