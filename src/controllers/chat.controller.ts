import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import * as chatService from '../services/chat.service';

/**
 * Get chat history for a user
 */
export const getChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const limit = parseInt(req.query.limit as string || '50', 10);
    const offset = parseInt(req.query.offset as string || '0', 10);

    const messages = await chatService.getChatHistory(userId, limit, offset);
    res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

/**
 * Send a new chat message
 */
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { message } = req.body;
    
    if (!message) {
      throw new ApiError(400, 'Message is required');
    }

    const savedMessage = await chatService.saveChatMessage({
      userId,
      message,
      timestamp: new Date()
    });

    // In a real implementation, you would process the message with AI here
    // and return both the user message and AI response
    
    res.status(201).json(savedMessage);
  } catch (error) {
    logger.error('Error sending message:', error);
    next(error);
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || !messageIds.length) {
      throw new ApiError(400, 'Valid messageIds array is required');
    }

    await chatService.markMessagesAsRead(userId, messageIds);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete chat messages
 */
export const deleteMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'User ID not found');
    }

    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || !messageIds.length) {
      throw new ApiError(400, 'Valid messageIds array is required');
    }

    await chatService.deleteChatMessages(userId, messageIds);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
