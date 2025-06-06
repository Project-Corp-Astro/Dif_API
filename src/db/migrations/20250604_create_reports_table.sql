-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  status VARCHAR(50) NOT NULL,
  parameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own reports
CREATE POLICY reports_select_policy ON reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own reports
CREATE POLICY reports_insert_policy ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own reports
CREATE POLICY reports_update_policy ON reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy for users to delete their own reports
CREATE POLICY reports_delete_policy ON reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION update_reports_updated_at();
