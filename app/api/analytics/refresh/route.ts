import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clearCache } from '../lib/cacheManager';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.EMPLOYEE_APP_SUPABASE_URL!,
    process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, dataSource } = body;

    const supabase = getSupabase();

    // Clear specific cache entries
    const success = await clearCache(supabase, siteId, dataSource);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to clear cache' },
        { status: 500 }
      );
    }

    // Log the refresh action
    console.log(`[analytics/refresh] Cache cleared - siteId: ${siteId || 'all'}, dataSource: ${dataSource || 'all'}`);

    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully. Data will refresh on next request.',
      cleared: {
        siteId: siteId || 'all',
        dataSource: dataSource || 'all',
      },
    });
  } catch (error) {
    console.error('[analytics/refresh] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clean up expired cache entries
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Delete expired entries
    const { error } = await supabase
      .from('analytics_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[analytics/refresh] Error cleaning expired cache:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to clean expired cache' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expired cache entries cleaned',
    });
  } catch (error) {
    console.error('[analytics/refresh] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
