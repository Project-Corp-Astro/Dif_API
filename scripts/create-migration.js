#!/usr/bin/env node

/**
 * Migration creation script
 * Creates a new migration file with a timestamp prefix
 */

const fs = require('fs');
const path = require('path');

// Get the migration name from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Error: Migration name is required');
  console.error('Usage: npm run migrate:create <migration_name>');
  process.exit(1);
}

const migrationName = args[0].toLowerCase().replace(/\s+/g, '_');

// Create a timestamp for the migration file
const now = new Date();
const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');

// Create the migration file name
const fileName = `${timestamp}_${migrationName}.sql`;

// Path to the migrations directory
const migrationsDir = path.join(__dirname, '../src/db/migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Create the migration file
const filePath = path.join(migrationsDir, fileName);

// Check if file already exists
if (fs.existsSync(filePath)) {
  console.error(`Error: Migration file ${fileName} already exists`);
  process.exit(1);
}

// Template for the migration file
const template = `-- Migration: ${migrationName}
-- Created at: ${now.toISOString()}

-- Write your SQL migration here

-- Example:
-- CREATE TABLE IF NOT EXISTS example (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Don't forget to add any necessary indexes, constraints, and permissions
`;

// Write the file
fs.writeFileSync(filePath, template);

console.log(`Created migration file: ${fileName}`);
