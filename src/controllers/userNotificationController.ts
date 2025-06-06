import { Request, Response } from 'express';
import { User } from '../models/User';
import { NotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

/**
 * Controller for handling user notification preferences and FCM tokens
 */
export class UserNotificationController {
  /**
   * Save a user's FCM token
   * @param req Request with userId and fcmToken in body
   * @param res Response
   */
  static async saveFCMToken(req: Request, res: Response): Promise<void> {
    try {
      const { userId, fcmToken } = req.body;

      if (!userId || !fcmToken) {
        res.status(400).json({ error: 'userId and fcmToken are required' });
        return;
      }

      // Find the user and update their FCM token
      const user = await User.findById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update the user's FCM token
      user.fcmToken = fcmToken;
      await user.save();

      // Subscribe the user to their personalized topic (e.g., for horoscope updates)
      const userTopic = `user_${userId}`;
      await NotificationService.subscribeToTopic(fcmToken, userTopic);

      // Subscribe to general app topics
      await NotificationService.subscribeToTopic(fcmToken, 'general_announcements');
      
      logger.info(`FCM token saved for user ${userId}`);
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error saving FCM token:', error);
      res.status(500).json({ error: 'Failed to save FCM token' });
    }
  }

  /**
   * Update a user's notification preferences
   * @param req Request with userId and notificationPreferences in body
   * @param res Response
   */
  static async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId, notificationPreferences } = req.body;

      if (!userId || !notificationPreferences) {
        res.status(400).json({ error: 'userId and notificationPreferences are required' });
        return;
      }

      // Find the user and update their notification preferences
      const user = await User.findById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update the user's notification preferences
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
      await user.save();

      // If notifications are disabled, unsubscribe from all topics
      if (notificationPreferences.enabled === false && user.fcmToken) {
        await NotificationService.unsubscribeFromTopic(user.fcmToken, `user_${userId}`);
        await NotificationService.unsubscribeFromTopic(user.fcmToken, 'general_announcements');
      }
      // If notifications are enabled, resubscribe to topics
      else if (notificationPreferences.enabled === true && user.fcmToken) {
        await NotificationService.subscribeToTopic(user.fcmToken, `user_${userId}`);
        await NotificationService.subscribeToTopic(user.fcmToken, 'general_announcements');
      }

      logger.info(`Notification preferences updated for user ${userId}`);
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }

  /**
   * Send a test notification to a user
   * @param req Request with userId in params
   * @param res Response
   */
  static async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      // Find the user
      const user = await User.findById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (!user.fcmToken) {
        res.status(400).json({ error: 'User does not have an FCM token registered' });
        return;
      }

      // Send a test notification
      await NotificationService.sendNotification(
        user.fcmToken,
        'Test Notification',
        'This is a test notification from Corp Astro',
        {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      );

      logger.info(`Test notification sent to user ${userId}`);
      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  }
}

export default UserNotificationController;
