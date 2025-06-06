-- Initial database schema for corp-astro-api
-- This migration creates the core tables needed for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  birth_date DATE,
  zodiac_sign TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"notifications": {"dailyHoroscope": true, "chat": true, "newFeatures": true}, "theme": "system", "language": "en"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly', 'lifetime')),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled', 'pending', 'trial')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  auto_renew BOOLEAN DEFAULT TRUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  receipt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create index on user_id for chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Horoscopes table
CREATE TABLE IF NOT EXISTS horoscopes (
  id TEXT PRIMARY KEY,
  sign TEXT NOT NULL CHECK (sign IN ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces')),
  date DATE NOT NULL,
  prediction TEXT NOT NULL,
  compatibility TEXT NOT NULL,
  mood TEXT NOT NULL,
  color TEXT NOT NULL,
  lucky_number TEXT NOT NULL,
  lucky_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on sign and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_horoscopes_sign_date ON horoscopes(sign, date);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('monthly', 'yearly', 'compatibility', 'career')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  parameters JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for reports
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'Profile Images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'Generated Reports', false) ON CONFLICT DO NOTHING;

-- Set up row level security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports policies
CREATE POLICY "Users can view their own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can access their own reports" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
