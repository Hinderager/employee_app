import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// ===== TOP SHELF EMPLOYEE APP SUPABASE =====
// This Supabase project contains: job_materials table (for move billing)

// Server-side client cache - DO NOT use in client components
let serverSupabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

// Server-side only - this will be tree-shaken out of client bundles
function getServerSupabase() {
  if (!serverSupabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Server Supabase configuration is missing');
    }

    serverSupabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  }

  return serverSupabaseInstance;
}

// Export for server-side use only - import from '@/lib/supabase-server' instead
export const supabase = getServerSupabase();

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

// ===== OMW TEXT SUPABASE (for Vehicle Locations) =====
// This Supabase project contains: bouncie_tokens table (for vehicle GPS tracking)
const omwTextUrl = process.env.OMW_TEXT_SUPABASE_URL || '';
const omwTextAnonKey = process.env.OMW_TEXT_SUPABASE_ANON_KEY || '';

// Create separate OMW Text Supabase client for vehicle locations
export const omwTextSupabase = createSupabaseClient(omwTextUrl, omwTextAnonKey);

/**
 * Get the current Bouncie access token from OMW Text Supabase
 * This token is auto-refreshed every 50 minutes by the OMW Text n8n workflow
 */
export async function getBouncieToken(): Promise<string | null> {
  try {
    const { data, error } = await omwTextSupabase
      .from('bouncie_tokens')
      .select('token_value')
      .eq('token_type', 'access_token')
      .single();

    if (error) {
      console.error('Error fetching Bouncie token from OMW Text Supabase:', error);
      return null;
    }

    return data?.token_value || null;
  } catch (error) {
    console.error('Error in getBouncieToken:', error);
    return null;
  }
}
