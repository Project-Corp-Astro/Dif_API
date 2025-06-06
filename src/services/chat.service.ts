import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { ApiError } from '../middlewares/error.middleware';
import { redis } from '../config/redis';

// Message interface
export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  readAt?: Date;
}

/**
 * Save a chat message to the database
 */
export const saveChatMessage = async (messageData: {
  userId: string;
  message: string;
  timestamp: Date;
}): Promise<ChatMessage> => {
  try {
    const { userId, message, timestamp } = messageData;
    
    // Generate a unique ID for the message
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create message object
    const chatMessage: ChatMessage = {
      id,
      userId,
      message,
      sender: 'user',
      timestamp,
    };
    
    // Save to database
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id,
        user_id: userId,
        message,
        sender: 'user',
        timestamp: timestamp.toISOString(),
      });
      
    if (error) {
      logger.error('Error saving chat message:', error);
      throw new ApiError(500, 'Failed to save chat message');
    }
    
    return chatMessage;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in saveChatMessage:', error);
    throw new ApiError(500, 'Failed to save chat message');
  }
};

/**
 * Get chat history for a user
 */
export const getChatHistory = async (
  userId: string,
  limit = 50,
  offset = 0
): Promise<ChatMessage[]> => {
  try {
    // Try to get from cache first
    const cacheKey = `chat:history:${userId}:${limit}:${offset}`;
    const cachedHistory = await redis.get(cacheKey);
    
    if (cachedHistory) {
      return JSON.parse(cachedHistory);
    }
    
    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (error) {
      logger.error('Error fetching chat history:', error);
      throw new ApiError(500, 'Failed to fetch chat history');
    }
    
    // Transform to ChatMessage objects
    const messages: ChatMessage[] = data.map(msg => ({
      id: msg.id,
      userId: msg.user_id,
      message: msg.message,
      sender: msg.sender,
      timestamp: new Date(msg.timestamp),
      readAt: msg.read_at ? new Date(msg.read_at) : undefined,
    }));
    
    // Cache the result for 5 minutes
    await redis.set(cacheKey, JSON.stringify(messages), 'EX', 300);
    
    return messages;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in getChatHistory:', error);
    throw new ApiError(500, 'Failed to fetch chat history');
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  userId: string,
  messageIds: string[]
): Promise<void> => {
  try {
    if (!messageIds.length) return;
    
    const now = new Date().toISOString();
    
    // Update messages in database
    const { error } = await supabase
      .from('chat_messages')
      .update({ read_at: now })
      .eq('user_id', userId)
      .in('id', messageIds)
      .is('read_at', null);
      
    if (error) {
      logger.error('Error marking messages as read:', error);
      throw new ApiError(500, 'Failed to mark messages as read');
    }
    
    // Invalidate cache
    const cachePattern = `chat:history:${userId}:*`;
    const keys = await redis.keys(cachePattern);
    
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in markMessagesAsRead:', error);
    throw new ApiError(500, 'Failed to mark messages as read');
  }
};

/**
 * Delete chat messages
 */
export const deleteChatMessages = async (
  userId: string,
  messageIds: string[]
): Promise<void> => {
  try {
    if (!messageIds.length) return;
    
    // Delete messages from database
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId)
      .in('id', messageIds);
      
    if (error) {
      logger.error('Error deleting chat messages:', error);
      throw new ApiError(500, 'Failed to delete chat messages');
    }
    
    // Invalidate cache
    const cachePattern = `chat:history:${userId}:*`;
    const keys = await redis.keys(cachePattern);
    
    if (keys.length) {
      await redis.del(keys);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('Error in deleteChatMessages:', error);
    throw new ApiError(500, 'Failed to delete chat messages');
  }
};
