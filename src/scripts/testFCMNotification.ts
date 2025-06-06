import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { NotificationService } from '../services/notificationService';
import { User, IUser } from '../models/User';

// Load environment variables
dotenv.config();

/**
 * Script to test sending FCM notifications to users
 * 
 * Usage:
 * - Run with no arguments to send to all users: npm run test-fcm
 * - Run with user ID to send to specific user: npm run test-fcm -- --userId=123456
 * - Run with topic to send to topic: npm run test-fcm -- --topic=daily-horoscope
 */

// Parse command line arguments
const args = process.argv.slice(2);
let userId: string | undefined;
let topic: string | undefined;

args.forEach(arg => {
  if (arg.startsWith('--userId=')) {
    userId = arg.split('=')[1];
  } else if (arg.startsWith('--topic=')) {
    topic = arg.split('=')[1];
  }
});

async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    // Notification content
    const title = 'FCM Test Notification';
    const body = 'This is a test notification sent from the FCM test script';
    const data = {
      type: 'test',
      timestamp: new Date().toISOString(),
      screen: 'NotificationTest'
    };

    // Send notification based on arguments
    if (userId) {
      // Send to specific user
      console.log(`Sending test notification to user: ${userId}`);
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      if (!user.fcmToken) {
        throw new Error(`User with ID ${userId} does not have an FCM token registered`);
      }
      
      await NotificationService.sendNotification(
        user.fcmToken,
        title,
        body,
        data
      );
      console.log('Notification sent successfully to user');
    } else if (topic) {
      // Send to topic
      console.log(`Sending test notification to topic: ${topic}`);
      await NotificationService.sendTopicNotification(
        topic,
        title,
        body,
        data
      );
      console.log('Notification sent successfully to topic');
    } else {
      // Send to all users with FCM tokens
      console.log('Sending test notification to all users with FCM tokens');
      const users = await User.find({ fcmToken: { $exists: true, $ne: null } });
      
      if (users.length === 0) {
        throw new Error('No users found with FCM tokens');
      }
      
      const tokens = users.map((user: IUser) => user.fcmToken).filter(Boolean) as string[];
      
      console.log(`Found ${tokens.length} FCM tokens`);
      
      await NotificationService.sendMulticastNotification(
        tokens,
        title,
        body,
        data
      );
      console.log('Notification sent successfully to all users');
    }

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error in FCM test script:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

main();
