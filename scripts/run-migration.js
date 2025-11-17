const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('   URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'create_jobs_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📄 Migration file loaded:', sqlPath);
    console.log('\n🚀 Executing migration...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, we need to run SQL manually
      console.log('⚠️  Cannot execute SQL directly via API.');
      console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
      console.log('   Dashboard → SQL Editor → New Query\n');
      console.log('─'.repeat(60));
      console.log(sql);
      console.log('─'.repeat(60));
      console.log('\n💡 Or use the Supabase CLI: supabase db push');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Jobs table created with:');
    console.log('   • job_number (TEXT, PRIMARY KEY)');
    console.log('   • address (TEXT, NOT NULL)');
    console.log('   • created_at (TIMESTAMP)');
    console.log('   • updated_at (TIMESTAMP)');
    console.log('   • Index on address for fast lookups');
    console.log('   • RLS enabled with permissive policy');

  } catch (err) {
    console.error('❌ Error running migration:', err.message);
    process.exit(1);
  }
}

runMigration();
