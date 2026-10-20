/**
 * Automated Supabase Migration Runner
 * Usage:
 *   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" node scripts/apply-supabase-migrations.cjs
 * Or:
 *   SUPABASE_DB_HOST="db.[PROJECT-REF].supabase.co" SUPABASE_DB_PASSWORD="[PASSWORD]" node scripts/apply-supabase-migrations.cjs
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
  const host = process.env.SUPABASE_DB_HOST || process.env.PGHOST;
  const port = parseInt(process.env.SUPABASE_DB_PORT || process.env.PGPORT || '5432', 10);
  const user = process.env.SUPABASE_DB_USER || process.env.PGUSER || 'postgres';
  const database = process.env.SUPABASE_DB_NAME || process.env.PGDATABASE || 'postgres';

  if (!connectionString && (!host || !password)) {
    console.error('❌ Error: Supabase database connection details missing.');
    console.error('Please provide DATABASE_URL or set SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD:');
    console.error('  DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" node scripts/apply-supabase-migrations.cjs');
    console.error('Or:');
    console.error('  SUPABASE_DB_HOST="db.[YOUR-PROJECT-REF].supabase.co" SUPABASE_DB_PASSWORD="your-password" node scripts/apply-supabase-migrations.cjs');
    process.exit(1);
  }

  const sqlFilePath = path.resolve(__dirname, '..', 'supabase_migrations', 'full_schema_setup.sql');
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ Migration file not found at: ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  const clientConfig = connectionString
    ? {
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      }
    : {
        host,
        port,
        database,
        user,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 15000,
      };

  const client = new Client(clientConfig);

  console.log(`🔄 Connecting to Supabase PostgreSQL (${connectionString ? 'via DATABASE_URL' : `${host}:${port}`})...`);

  try {
    await client.connect();
    console.log('✅ Connected successfully to Supabase PostgreSQL.');
    console.log('🚀 Applying full database schema, tables, indexes, and triggers...');

    await client.query(sqlContent);

    console.log('🎉 Database migrations applied successfully!');
    console.log('All tables (customers, vehicles, inventory, job_cards, invoices, etc.) are now created in Supabase.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
