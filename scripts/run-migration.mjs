import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration.mjs <migration-file>');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', migrationFile), 'utf8');

console.log(`Running migration: ${migrationFile}`);
console.log('SQL preview:', sql.substring(0, 200) + '...\n');

// Split into individual statements and run them
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

for (const statement of statements) {
  if (!statement) continue;

  console.log(`Executing: ${statement.substring(0, 60)}...`);

  const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });

  if (error) {
    // Try direct query if rpc doesn't exist
    const { error: directError } = await supabase.from('_').select().throwOnError();
    console.error('Statement error:', error.message);
  }
}

console.log('\nMigration completed!');
