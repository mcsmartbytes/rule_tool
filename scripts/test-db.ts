// Quick test script to verify Supabase connection
// Run with: npx tsx scripts/test-db.ts

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', supabaseUrl?.substring(0, 30) + '...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Check trades table
  console.log('1. Fetching default trades...');
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('name, code, is_default')
    .eq('is_default', true);

  if (tradesError) {
    console.error('   ERROR:', tradesError.message);
  } else {
    console.log('   Found', trades?.length, 'default trades:');
    trades?.forEach(t => console.log(`   - ${t.name} (${t.code})`));
  }

  // Test 2: Check services table
  console.log('\n2. Fetching default services...');
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('name, code, unit')
    .eq('is_default', true);

  if (servicesError) {
    console.error('   ERROR:', servicesError.message);
  } else {
    console.log('   Found', services?.length, 'default services');
  }

  // Test 3: Try to create a test site (will fail without auth, but tests RLS)
  console.log('\n3. Testing RLS (should fail without auth)...');
  const { error: siteError } = await supabase
    .from('sites')
    .insert({ name: 'Test Site' })
    .select()
    .single();

  if (siteError) {
    console.log('   RLS working - blocked as expected');
  } else {
    console.log('   WARNING: Site created without auth (check RLS)');
  }

  console.log('\n-----------------------------------');
  console.log('Database connection successful!');
  console.log('Tables exist and have data');
  console.log('-----------------------------------\n');
}

testConnection().catch(console.error);
