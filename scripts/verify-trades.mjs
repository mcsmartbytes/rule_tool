import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function verify() {
  console.log('Verifying trades and services...\n');

  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('id, name, code, color, sort_order')
    .order('sort_order');

  if (tradesError) {
    console.error('Error fetching trades:', tradesError);
  } else {
    console.log('TRADES:');
    console.table(trades);
  }

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, code, unit, labor_rate, material_cost')
    .order('code');

  if (servicesError) {
    console.error('Error fetching services:', servicesError);
  } else {
    console.log('\nSERVICES:');
    console.table(services);
  }
}

verify();
