#!/usr/bin/env node

/**
 * Database migration runner script
 * This script runs the migration runner from the compiled TypeScript code
 */

// Check if the environment is production
const isProd = process.env.NODE_ENV === 'production';

// In production, run the compiled JavaScript
if (isProd) {
  require('../dist/db/migrate');
} else {
  // In development, use ts-node to run the TypeScript directly
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
    },
  });
  require('../src/db/migrate');
}

console.log('Migration script completed.');
