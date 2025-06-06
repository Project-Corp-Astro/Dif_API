import mongoose from 'mongoose';
import { User } from '../models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple logger for this script
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || '')
};

/**
 * Script to migrate users from Expo Push Tokens to FCM tokens
 * 
 * This script should be run after the mobile app has been updated to use FCM
 * and users have started registering their FCM tokens.
 * 
 * It will:
 * 1. Find users with the old expoPushToken field
 * 2. Remove the expoPushToken field
 * 3. Log users who need to register their FCM token
 */
async function migrateToFCM() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || '');
    logger.info('Connected to MongoDB');

    // Find users with expoPushToken field
    const usersToMigrate = await User.find({ expoPushToken: { $exists: true } });
    logger.info(`Found ${usersToMigrate.length} users to migrate`);

    // Process each user
    for (const user of usersToMigrate) {
      logger.info(`Migrating user: ${user._id} (${user.email})`);
      
      // Remove the expoPushToken field
      await User.updateOne(
        { _id: user._id },
        { $unset: { expoPushToken: "" } }
      );
      
      logger.info(`Removed expoPushToken for user: ${user._id}`);
    }

    // Find users without FCM tokens
    const usersWithoutFCM = await User.find({ fcmToken: { $exists: false } });
    logger.info(`${usersWithoutFCM.length} users need to register their FCM token`);
    
    // Log users who need to register FCM tokens
    usersWithoutFCM.forEach(user => {
      logger.info(`User needs FCM token: ${user._id} (${user.email})`);
    });

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
}

// Run the migration
migrateToFCM();
