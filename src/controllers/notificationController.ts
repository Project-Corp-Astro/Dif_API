import { Request, Response } from 'express';
import { User } from '../models/User';
import NotificationService from '../services/notificationService';
import logger from '../utils/logger';

/**
 * Controller for handling notification-related operations
 */
class NotificationController {
  /**
   * Register or update an FCM token for a user
   * @param req Request with userId and fcmToken in body
   * @param res Response
   */
  async registerFCMToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId, fcmToken } = req.body;

      if (!userId || !fcmToken) {
        res.status(400).json({ success: false, message: 'User ID and FCM token are required' });
        return;
      }

      // Find user and update FCM token
      const user = await User.findByIdAndUpdate(
        userId,
        { fcmToken, notificationsEnabled: true },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      logger.info(`FCM token registered for user ${userId}`);
      res.status(200).json({ success: true, message: 'FCM token registered successfully' });
    } catch (error) {
      logger.error('Error registering FCM token:', error);
      res.status(500).json({ success: false, message: 'Failed to register FCM token' });
    }
  }

  /**
   * Delete an FCM token for a user
   * @param req Request with userId in params
   * @param res Response
   */
  async deleteFCMToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID is required' });
        return;
      }

      // Find user and remove FCM token
      const user = await User.findByIdAndUpdate(
        userId,
        { $unset: { fcmToken: "" }, notificationsEnabled: false },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      logger.info(`FCM token deleted for user ${userId}`);
      res.status(200).json({ success: true, message: 'FCM token deleted successfully' });
    } catch (error) {
      logger.error('Error deleting FCM token:', error);
      res.status(500).json({ success: false, message: 'Failed to delete FCM token' });
    }
  }

  /**
   * Subscribe a user to a topic
   * @param req Request with userId and topic in body
   * @param res Response
   */
  async subscribeToTopic(req: Request, res: Response): Promise<void> {
    try {
      const { userId, topic } = req.body;

      if (!userId || !topic) {
        res.status(400).json({ success: false, message: 'User ID and topic are required' });
        return;
      }

      // Find user to get FCM token
      const user = await User.findById(userId);

      if (!user || !user.fcmToken) {
        res.status(404).json({ success: false, message: 'User not found or FCM token not registered' });
        return;
      }

      // Subscribe to topic
      await NotificationService.subscribeToTopic(user.fcmToken, topic);

      logger.info(`User ${userId} subscribed to topic ${topic}`);
      res.status(200).json({ success: true, message: `Subscribed to topic ${topic} successfully` });
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      res.status(500).json({ success: false, message: 'Failed to subscribe to topic' });
    }
  }

  /**
   * Unsubscribe a user from a topic
   * @param req Request with userId and topic in body
   * @param res Response
   */
  async unsubscribeFromTopic(req: Request, res: Response): Promise<void> {
    try {
      const { userId, topic } = req.body;

      if (!userId || !topic) {
        res.status(400).json({ success: false, message: 'User ID and topic are required' });
        return;
      }

      // Find user to get FCM token
      const user = await User.findById(userId);

      if (!user || !user.fcmToken) {
        res.status(404).json({ success: false, message: 'User not found or FCM token not registered' });
        return;
      }

      // Unsubscribe from topic
      await NotificationService.unsubscribeFromTopic(user.fcmToken, topic);

      logger.info(`User ${userId} unsubscribed from topic ${topic}`);
      res.status(200).json({ success: true, message: `Unsubscribed from topic ${topic} successfully` });
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      res.status(500).json({ success: false, message: 'Failed to unsubscribe from topic' });
    }
  }

  /**
   * Send a test notification to a user
   * @param req Request with userId, title, body, and optional data in body
   * @param res Response
   */
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title, body, data } = req.body;

      if (!userId || !title || !body) {
        res.status(400).json({ success: false, message: 'User ID, title, and body are required' });
        return;
      }

      // Find user to get FCM token
      const user = await User.findById(userId);

      if (!user || !user.fcmToken) {
        res.status(404).json({ success: false, message: 'User not found or FCM token not registered' });
        return;
      }

      // Send notification
      const messageId = await NotificationService.sendNotification(
        user.fcmToken,
        title,
        body,
        data || {}
      );

      logger.info(`Test notification sent to user ${userId}, message ID: ${messageId}`);
      res.status(200).json({ 
        success: true, 
        message: 'Test notification sent successfully',
        messageId
      });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ success: false, message: 'Failed to send test notification' });
    }
  }
}

export default new NotificationController();
