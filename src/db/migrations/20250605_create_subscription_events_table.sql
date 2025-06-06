-- Create subscription_events table for tracking subscription lifecycle events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  product_id VARCHAR(255),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at);

-- Add RLS policies for security
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own subscription events
CREATE POLICY subscription_events_select_policy ON subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow the service role to insert/update/delete subscription events
CREATE POLICY subscription_events_insert_policy ON subscription_events
  FOR INSERT
  WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

CREATE POLICY subscription_events_update_policy ON subscription_events
  FOR UPDATE
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

CREATE POLICY subscription_events_delete_policy ON subscription_events
  FOR DELETE
  USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Grant permissions to authenticated users and service role
GRANT SELECT ON subscription_events TO authenticated;
GRANT ALL ON subscription_events TO service_role;

-- Add column to subscriptions table for tracking refunds
ALTER TABLE IF EXISTS subscriptions 
ADD COLUMN IF NOT EXISTS refunded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP WITH TIME ZONE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_events_updated_at
BEFORE UPDATE ON subscription_events
FOR EACH ROW
EXECUTE FUNCTION update_subscription_events_updated_at();

-- Add comment to the table
COMMENT ON TABLE subscription_events IS 'Tracks subscription lifecycle events like purchases, renewals, cancellations, and refunds';
