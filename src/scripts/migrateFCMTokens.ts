import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, IUser } from '../models/User';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Script to migrate users from Expo Push Tokens to FCM tokens
 * 
 * This script:
 * 1. Finds all users with expoPushToken but no fcmToken
 * 2. Logs statistics about tokens
 * 3. Optionally clears expoPushTokens when specified
 * 
 * Usage:
 * - npm run migrate-fcm
 * - npm run migrate-fcm -- --clear-expo-tokens
 */

// Connect to MongoDB
const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/corp-astro';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB Connected...');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Main migration function
const migrateFCMTokens = async (clearExpoTokens: boolean = false): Promise<void> => {
  try {
    // Find users with expoPushToken but no fcmToken
    const usersWithExpoToken = await User.find({
      expoPushToken: { $exists: true, $ne: null },
      fcmToken: { $exists: false }
    });

    // Find users with fcmToken
    const usersWithFCMToken = await User.find({
      fcmToken: { $exists: true, $ne: null }
    });

    // Find users with both tokens
    const usersWithBothTokens = await User.find({
      expoPushToken: { $exists: true, $ne: null },
      fcmToken: { $exists: true, $ne: null }
    });

    // Log statistics
    logger.info(`Total users with Expo Push Token only: ${usersWithExpoToken.length}`);
    logger.info(`Total users with FCM Token: ${usersWithFCMToken.length}`);
    logger.info(`Total users with both tokens: ${usersWithBothTokens.length}`);

    // If clearExpoTokens flag is set, clear expoPushTokens for users with fcmToken
    if (clearExpoTokens && usersWithBothTokens.length > 0) {
      logger.info(`Clearing Expo Push Tokens for ${usersWithBothTokens.length} users with FCM tokens...`);
      
      const updateResult = await User.updateMany(
        { fcmToken: { $exists: true, $ne: null } },
        { $unset: { expoPushToken: "" } }
      );
      
      logger.info(`Updated ${updateResult.modifiedCount} users. Removed Expo Push Tokens.`);
    }

    // Log users that still need migration
    if (usersWithExpoToken.length > 0) {
      logger.info('The following users still need to be migrated to FCM:');
      usersWithExpoToken.forEach((user: IUser) => {
        logger.info(`User ID: ${user._id}, Email: ${user.email}, Expo Token: ${user.expoPushToken}`);
      });
    } else {
      logger.info('All users have been migrated to FCM tokens!');
    }

  } catch (error) {
    logger.error('Error during FCM token migration:', error);
  }
};

// Parse command line arguments
const parseArgs = (): { clearExpoTokens: boolean } => {
  const args = process.argv.slice(2);
  return {
    clearExpoTokens: args.includes('--clear-expo-tokens')
  };
};

// Run the migration
const run = async (): Promise<void> => {
  try {
    await connectDB();
    const { clearExpoTokens } = parseArgs();
    
    logger.info('Starting FCM token migration...');
    if (clearExpoTokens) {
      logger.info('Will clear Expo Push Tokens for users with FCM tokens');
    }
    
    await migrateFCMTokens(clearExpoTokens);
    logger.info('Migration complete');
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Execute the script
run();
