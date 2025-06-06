import { createClient } from '@supabase/supabase-js';
import { config } from './index';
import { logger } from './logger';

// Create Supabase client with service role key for backend operations
const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

// For FCM testing, we'll create a mock Supabase client if credentials are missing
let supabase: any;

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Missing Supabase URL or key - creating mock client for FCM testing');
  
  // Create a mock Supabase client for FCM testing
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    // Add other mock methods as needed
  };
} else {
  // Create real Supabase client if credentials are available
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { supabase };

// Test the connection
supabase.auth.getSession().then(({ data, error }: { data: any; error: any }) => {
  if (error) {
    logger.error('Failed to connect to Supabase:', error);
  } else {
    logger.info('Successfully connected to Supabase');
  }
});
