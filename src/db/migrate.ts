import fs from 'fs';
import path from 'path';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';

/**
 * Database migration runner
 * Runs SQL migration files in order
 */
async function runMigrations() {
  try {
    logger.info('Starting database migrations...');
    
    // Get migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    logger.info(`Found ${migrationFiles.length} migration files`);
    
    // Create migrations table if it doesn't exist
    await supabase.rpc('create_migrations_table_if_not_exists', {});
    
    // Get already applied migrations
    const { data: appliedMigrations, error } = await supabase
      .from('migrations')
      .select('name');
      
    if (error) {
      throw new Error(`Failed to get applied migrations: ${error.message}`);
    }
    
    const appliedMigrationNames = appliedMigrations?.map(m => m.name) || [];
    
    // Run each migration that hasn't been applied yet
    for (const file of migrationFiles) {
      if (appliedMigrationNames.includes(file)) {
        logger.info(`Migration ${file} already applied, skipping`);
        continue;
      }
      
      logger.info(`Applying migration: ${file}`);
      
      // Read migration file
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Run migration
      const { error: migrationError } = await supabase.rpc('run_sql', { sql });
      
      if (migrationError) {
        throw new Error(`Failed to apply migration ${file}: ${migrationError.message}`);
      }
      
      // Record migration as applied
      const { error: insertError } = await supabase
        .from('migrations')
        .insert({ name: file, applied_at: new Date().toISOString() });
        
      if (insertError) {
        throw new Error(`Failed to record migration ${file}: ${insertError.message}`);
      }
      
      logger.info(`Successfully applied migration: ${file}`);
    }
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
