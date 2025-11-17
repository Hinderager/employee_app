import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ===== CLIENT-SIDE SUPABASE =====
// Create client function for client components - Employee App (for move billing)
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.error('[Supabase] ERROR: URL or Anon Key is missing!', { url: !!url, key: !!key });
    throw new Error('Supabase configuration is missing. Check your .env.local file.');
  }

  try {
    return createSupabaseClient(url, key);
  } catch (error) {
    console.error('[Supabase] ERROR creating client:', error);
    throw error;
  }
}
