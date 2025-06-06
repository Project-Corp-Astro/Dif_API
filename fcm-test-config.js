/**
 * FCM Test Configuration
 * This file contains non-sensitive configuration for FCM testing
 */

module.exports = {
  // MongoDB connection (use a test database)
  mongoUri: 'mongodb://localhost:27017/corp-astro-test',
  
  // Server configuration
  port: 3000,
  
  // Test notification settings
  testNotification: {
    title: 'FCM Test Notification',
    body: 'This is a test notification from the FCM migration process',
    data: {
      type: 'test',
      screen: 'FCMTestScreen'
    }
  },
  
  // Test topics
  testTopics: [
    'test-topic',
    'daily-horoscope',
    'weekly-horoscope'
  ]
};
