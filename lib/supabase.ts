import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Supabase configuration (same as OMW Text project)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Create Supabase client (singleton for server-side)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Create client function for client components
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.error('Supabase URL or Anon Key is missing');
  }

  return createSupabaseClient(url, key);
}

/**
 * Get the current Bouncie access token from Supabase
 * This token is auto-refreshed every 50 minutes by the OMW Text n8n workflow
 */
export async function getBouncieToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('bouncie_tokens')
      .select('token_value')
      .eq('token_type', 'access_token')
      .single();

    if (error) {
      console.error('Error fetching Bouncie token from Supabase:', error);
      return null;
    }

    return data?.token_value || null;
  } catch (error) {
    console.error('Error in getBouncieToken:', error);
    return null;
  }
}
