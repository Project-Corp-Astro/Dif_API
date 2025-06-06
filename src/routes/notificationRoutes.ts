import express from 'express';
import { UserNotificationController } from '../controllers/userNotificationController';
import notificationController from '../controllers/notificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Legacy routes for managing FCM tokens and notification preferences
router.post('/fcm-token', authMiddleware, UserNotificationController.saveFCMToken);
router.put('/preferences', authMiddleware, UserNotificationController.updateNotificationPreferences);
router.post('/test/:userId', authMiddleware, UserNotificationController.sendTestNotification);

// New FCM routes
router.post('/register-token', authMiddleware, notificationController.registerFCMToken);
router.delete('/token/:userId', authMiddleware, notificationController.deleteFCMToken);
router.post('/subscribe-topic', authMiddleware, notificationController.subscribeToTopic);
router.post('/unsubscribe-topic', authMiddleware, notificationController.unsubscribeFromTopic);
router.post('/send-test', authMiddleware, notificationController.sendTestNotification);

export default router;
