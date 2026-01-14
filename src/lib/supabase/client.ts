import { createClient } from '@supabase/supabase-js';

// Lazily initialize the Supabase client so `next build` doesn't require env vars.
// Next.js can evaluate server modules during build (route handlers, etc).
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are required (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  }

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Proxy to preserve existing `supabase.from(...).select(...)` call sites
export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    const client = getClient() as any;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export type { User, Session } from '@supabase/supabase-js';
