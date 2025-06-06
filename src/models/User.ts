import mongoose, { Document, Schema } from 'mongoose';

// Interface for notification preferences
export interface NotificationPreferences {
  enabled: boolean;
  dailyHoroscope: boolean;
  weeklyHoroscope: boolean;
  specialEvents: boolean;
  promotions: boolean;
}

// Interface for User document
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  birthDate: Date;
  birthTime?: string;
  birthLocation?: string;
  zodiacSign: string;
  fcmToken?: string; // Firebase Cloud Messaging token
  expoPushToken?: string; // Expo Push Token (legacy)
  notificationsEnabled: boolean; // Whether notifications are enabled
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

// Schema for notification preferences
const notificationPreferencesSchema = new Schema({
  enabled: { type: Boolean, default: true },
  dailyHoroscope: { type: Boolean, default: true },
  weeklyHoroscope: { type: Boolean, default: true },
  specialEvents: { type: Boolean, default: true },
  promotions: { type: Boolean, default: false }
});

// User schema
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    birthDate: {
      type: Date,
      required: true
    },
    birthTime: {
      type: String
    },
    birthLocation: {
      type: String
    },
    zodiacSign: {
      type: String,
      required: true
    },
    fcmToken: {
      type: String
    },
    expoPushToken: {
      type: String
    },
    notificationsEnabled: {
      type: Boolean,
      default: false
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

// Create and export User model
export const User = mongoose.model<IUser>('User', userSchema);

export default User;
