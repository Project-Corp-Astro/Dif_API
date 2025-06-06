-- Migration helper functions
-- These functions help with running migrations

-- Function to create migrations table if it doesn't exist
CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run SQL code
CREATE OR REPLACE FUNCTION run_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
