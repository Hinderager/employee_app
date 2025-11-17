import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('=== BOUNCIE TOKEN DEBUG ===');

    // Check Supabase connection
    console.log('Checking Supabase connection...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        error: 'Supabase credentials not configured',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      }, { status: 500 });
    }

    // Check bouncie_tokens table
    console.log('Querying bouncie_tokens table...');
    const { data, error } = await supabase
      .from('bouncie_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        error: 'Failed to query bouncie_tokens table',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    // Check for access_token specifically
    const accessToken = data?.find(t => t.token_type === 'access_token');

    if (!accessToken) {
      return NextResponse.json({
        error: 'No access_token found in bouncie_tokens table',
        allTokens: data?.map(t => ({
          type: t.token_type,
          created_at: t.created_at,
          updated_at: t.updated_at
        }))
      }, { status: 500 });
    }

    // Calculate token age
    const tokenAge = accessToken.updated_at
      ? Date.now() - new Date(accessToken.updated_at).getTime()
      : Date.now() - new Date(accessToken.created_at).getTime();

    const tokenAgeMinutes = Math.floor(tokenAge / 1000 / 60);
    const tokenAgeHours = Math.floor(tokenAgeMinutes / 60);

    // Check fallback env token
    const fallbackToken = process.env.BOUNCIE_ACCESS_TOKEN;

    // Test the token against Bouncie API (just check auth, don't fetch all vehicles)
    let bouncieApiStatus = 'unknown';
    let bouncieApiError = null;

    try {
      const testResponse = await fetch('https://api.bouncie.dev/v1/vehicles', {
        headers: {
          'Authorization': accessToken.token_value,
          'Content-Type': 'application/json'
        }
      });

      bouncieApiStatus = testResponse.ok ? 'valid' : `failed (${testResponse.status} ${testResponse.statusText})`;

      if (!testResponse.ok) {
        const errorBody = await testResponse.text();
        bouncieApiError = errorBody;
      }
    } catch (err) {
      bouncieApiStatus = 'error';
      bouncieApiError = err instanceof Error ? err.message : 'Unknown error';
    }

    return NextResponse.json({
      status: 'debug_info',
      supabase: {
        connected: true,
        url: supabaseUrl,
        hasKey: !!supabaseKey
      },
      bouncieToken: {
        exists: true,
        tokenType: accessToken.token_type,
        tokenPreview: accessToken.token_value?.substring(0, 20) + '...',
        createdAt: accessToken.created_at,
        updatedAt: accessToken.updated_at,
        ageMinutes: tokenAgeMinutes,
        ageHours: tokenAgeHours,
        isStale: tokenAgeMinutes > 60, // Should refresh every 50 mins
        expectedRefreshInterval: '50 minutes',
        lastRefreshWasAgo: `${tokenAgeHours}h ${tokenAgeMinutes % 60}m ago`
      },
      bouncieApi: {
        status: bouncieApiStatus,
        error: bouncieApiError
      },
      fallbackToken: {
        exists: !!fallbackToken,
        preview: fallbackToken?.substring(0, 20) + '...' || null
      },
      recommendation: tokenAgeMinutes > 60
        ? '⚠️ Token is stale! Check if the n8n token refresh workflow is running.'
        : '✅ Token appears fresh. Issue may be elsewhere.',
      allTokensInTable: data?.map(t => ({
        type: t.token_type,
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}
