import { NotificationService } from '../services/notificationService';
import { User, IUser } from '../models/User';
import * as cron from 'node-cron';

/**
 * Utility for sending scheduled notifications using Firebase Cloud Messaging
 */
export class ScheduledNotifications {
  /**
   * Initialize scheduled notifications
   */
  static init(): void {
    // Schedule daily horoscope notifications at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      await ScheduledNotifications.sendDailyHoroscopes();
    });

    // Schedule weekly horoscope notifications on Mondays at 9:00 AM
    cron.schedule('0 9 * * 1', async () => {
      await ScheduledNotifications.sendWeeklyHoroscopes();
    });

    console.log('Scheduled notifications initialized');
  }

  /**
   * Send daily horoscope notifications to all users who have enabled them
   */
  static async sendDailyHoroscopes(): Promise<void> {
    try {
      // Find all users who have enabled daily horoscope notifications
      const users = await User.find({
        fcmToken: { $exists: true },
        'notificationPreferences.enabled': true,
        'notificationPreferences.dailyHoroscope': true
      });

      console.log(`Sending daily horoscopes to ${users.length} users`);

      // Group users by zodiac sign for batch processing
      const usersBySign: Record<string, string[]> = {};
      
      users.forEach((user: IUser) => {
        if (!usersBySign[user.zodiacSign]) {
          usersBySign[user.zodiacSign] = [];
        }
        if (user.fcmToken) {
          usersBySign[user.zodiacSign].push(user.fcmToken);
        }
      });

      // Send notifications for each zodiac sign
      for (const [sign, tokens] of Object.entries(usersBySign)) {
        if (tokens.length === 0) continue;

        // Get horoscope content for this sign (replace with your actual horoscope service)
        const horoscope = await getHoroscopeForSign(sign);

        // Send multicast notification to all users with this sign
        await NotificationService.sendMulticastNotification(
          tokens,
          `Daily Horoscope for ${sign}`,
          horoscope,
          {
            type: 'daily_horoscope',
            sign,
            date: new Date().toISOString().split('T')[0]
          }
        );

        console.log(`Sent daily horoscope for ${sign} to ${tokens.length} users`);
      }
    } catch (error) {
      console.error('Error sending daily horoscopes:', error);
    }
  }

  /**
   * Send weekly horoscope notifications to all users who have enabled them
   */
  static async sendWeeklyHoroscopes(): Promise<void> {
    try {
      // Find all users who have enabled weekly horoscope notifications
      const users = await User.find({
        fcmToken: { $exists: true },
        'notificationPreferences.enabled': true,
        'notificationPreferences.weeklyHoroscope': true
      });

      console.log(`Sending weekly horoscopes to ${users.length} users`);

      // Group users by zodiac sign for batch processing
      const usersBySign: Record<string, string[]> = {};
      
      users.forEach((user: IUser) => {
        if (!usersBySign[user.zodiacSign]) {
          usersBySign[user.zodiacSign] = [];
        }
        if (user.fcmToken) {
          usersBySign[user.zodiacSign].push(user.fcmToken);
        }
      });

      // Send notifications for each zodiac sign
      for (const [sign, tokens] of Object.entries(usersBySign)) {
        if (tokens.length === 0) continue;

        // Get weekly horoscope content for this sign (replace with your actual horoscope service)
        const horoscope = await getWeeklyHoroscopeForSign(sign);

        // Send multicast notification to all users with this sign
        await NotificationService.sendMulticastNotification(
          tokens,
          `Weekly Horoscope for ${sign}`,
          horoscope,
          {
            type: 'weekly_horoscope',
            sign,
            week: getWeekNumber().toString()
          }
        );

        console.log(`Sent weekly horoscope for ${sign} to ${tokens.length} users`);
      }
    } catch (error) {
      console.error('Error sending weekly horoscopes:', error);
    }
  }
}

/**
 * Helper function to get daily horoscope for a sign
 * Replace this with your actual horoscope service
 */
async function getHoroscopeForSign(sign: string): Promise<string> {
  // This is a placeholder - replace with your actual horoscope API call
  const horoscopes: Record<string, string> = {
    Aries: 'Today is a great day for new beginnings. Take initiative!',
    Taurus: 'Focus on stability and financial matters today.',
    Gemini: 'Communication is key today. Express your thoughts clearly.',
    Cancer: 'Trust your intuition and focus on home and family.',
    Leo: 'Your creativity is at its peak. Showcase your talents!',
    Virgo: 'Pay attention to details and organize your surroundings.',
    Libra: 'Seek balance in your relationships and decisions.',
    Scorpio: 'Dive deep into your passions and transformative projects.',
    Sagittarius: 'Adventure awaits! Explore new horizons.',
    Capricorn: 'Focus on your career goals and long-term plans.',
    Aquarius: 'Innovative ideas will come to you today. Share them!',
    Pisces: 'Connect with your spiritual side and artistic pursuits.'
  };

  return horoscopes[sign] || 'The stars have aligned for you today!';
}

/**
 * Helper function to get weekly horoscope for a sign
 * Replace this with your actual horoscope service
 */
async function getWeeklyHoroscopeForSign(sign: string): Promise<string> {
  // This is a placeholder - replace with your actual horoscope API call
  const horoscopes: Record<string, string> = {
    Aries: 'This week brings opportunities for growth in your career. Stay focused!',
    Taurus: 'Financial matters improve this week. Consider long-term investments.',
    Gemini: 'Your social calendar is busy this week. Network and connect!',
    Cancer: 'Family matters take precedence this week. Nurture your relationships.',
    Leo: 'Creative projects flourish this week. Take the spotlight!',
    Virgo: 'Health and wellness are highlighted. Establish new routines.',
    Libra: 'Relationship harmony is achievable with compromise this week.',
    Scorpio: 'Transformation and renewal are themes for you this week.',
    Sagittarius: 'Travel or educational opportunities may arise this week.',
    Capricorn: 'Career advancement is possible with diligent effort this week.',
    Aquarius: 'Innovative solutions to old problems come to you this week.',
    Pisces: 'Spiritual growth and artistic inspiration flow freely this week.'
  };

  return horoscopes[sign] || 'The stars have aligned for you this week!';
}

/**
 * Helper function to get the current week number
 */
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return Math.ceil(day / 7);
}

export default ScheduledNotifications;
