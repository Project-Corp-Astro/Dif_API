import * as admin from 'firebase-admin';
import logger from '../utils/logger';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // For development, we'll use a more flexible approach
    // In production, use environment variables or secret management
    let serviceAccount;
    try {
      // Try to load from a local file
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
      serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // You can also specify your Firebase project ID here if needed
        // projectId: 'corp-astro-firebase'
      });
    } catch (fileError) {
      // If file not found, try using the default credential method
      // This works with Google Cloud and some other environments
      logger.warn('Service account file not found, trying application default credentials');
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
    
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('Firebase Admin SDK initialization error:', error);
  }
}

/**
 * Service for handling Firebase Cloud Messaging (FCM) notifications
 */
export class NotificationService {
  /**
   * Send a notification to a specific device
   * @param fcmToken The FCM token of the target device
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data payload
   * @returns Promise with the message ID if successful
   */
  static async sendNotification(
    fcmToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      logger.info(`Notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send a notification to multiple devices
   * @param fcmTokens Array of FCM tokens of target devices
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data payload
   * @returns Promise with the batch response
   */
  static async sendMulticastNotification(
    fcmTokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {}
  ): Promise<admin.messaging.BatchResponse> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        tokens: fcmTokens,
      };

      // Using sendEachForMulticast instead of sendMulticast for better type compatibility
      const response = await admin.messaging().sendEachForMulticast(message);
      logger.info(
        `${response.successCount} messages were sent successfully, ${response.failureCount} failed`
      );
      return response;
    } catch (error) {
      logger.error('Error sending multicast notification:', error);
      throw error;
    }
  }

  /**
   * Send a notification to a topic
   * @param topic The topic to send to
   * @param title Notification title
   * @param body Notification body
   * @param data Additional data payload
   * @returns Promise with the message ID if successful
   */
  static async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
  ): Promise<string> {
    try {
      const message = {
        notification: {
          title,
          body,
        },
        data,
        topic,
      };

      const response = await admin.messaging().send(message);
      logger.info(`Topic notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe a device to a topic
   * @param fcmToken The FCM token of the device
   * @param topic The topic to subscribe to
   * @returns Promise that resolves when subscription is complete
   */
  static async subscribeToTopic(
    fcmToken: string,
    topic: string
  ): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(fcmToken, topic);
      logger.info(`Device ${fcmToken} subscribed to topic ${topic}`);
    } catch (error) {
      logger.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe a device from a topic
   * @param fcmToken The FCM token of the device
   * @param topic The topic to unsubscribe from
   * @returns Promise that resolves when unsubscription is complete
   */
  static async unsubscribeFromTopic(
    fcmToken: string,
    topic: string
  ): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
      logger.info(`Device ${fcmToken} unsubscribed from topic ${topic}`);
    } catch (error) {
      logger.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }
}

export default NotificationService;
