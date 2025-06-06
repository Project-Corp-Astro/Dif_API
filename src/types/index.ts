// Shared types between frontend and backend

// Subscription related types
export enum SubscriptionPlan {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  PENDING = 'pending',
  TRIAL = 'trial',
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  platform: 'ios' | 'android' | 'web';
  receipt?: string;
  createdAt: string;
  updatedAt: string;
}

// User related types
export interface User {
  id: string;
  email: string;
  name?: string;
  birthDate?: string;
  zodiacSign?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: {
    dailyHoroscope: boolean;
    chat: boolean;
    newFeatures: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: string;
}

// Horoscope related types
export enum ZodiacSign {
  ARIES = 'aries',
  TAURUS = 'taurus',
  GEMINI = 'gemini',
  CANCER = 'cancer',
  LEO = 'leo',
  VIRGO = 'virgo',
  LIBRA = 'libra',
  SCORPIO = 'scorpio',
  SAGITTARIUS = 'sagittarius',
  CAPRICORN = 'capricorn',
  AQUARIUS = 'aquarius',
  PISCES = 'pisces',
}

export interface Horoscope {
  id: string;
  sign: ZodiacSign;
  date: string;
  prediction: string;
  compatibility: string;
  mood: string;
  color: string;
  luckyNumber: string;
  luckyTime: string;
}

// Chat related types
export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: string;
  readAt?: string;
}

// Report related types
export enum ReportType {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  COMPATIBILITY = 'compatibility',
  CAREER = 'career',
}

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  title: string;
  description: string;
  fileUrl?: string;
  createdAt: string;
  status: ReportStatus;
  parameters: Record<string, any>;
}

// API response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: any[];
}

// Error types
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  NETWORK = 'network',
  SUBSCRIPTION = 'subscription',
  PAYMENT = 'payment',
}
