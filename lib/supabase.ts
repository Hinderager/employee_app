import { createClient } from '@supabase/supabase-js';

// Supabase configuration (same as OMW Text project)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
