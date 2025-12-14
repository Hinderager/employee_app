import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    // Initialize Supabase client - using the website's move_estimates table
    const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
    const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the most recent move estimates from the website's table
    const { data, error } = await supabase
      .from('move_estimates')
      .select('id, quote_id, full_name, first_name, last_name, phone, email, from_address, to_address, service_type, move_date, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[recent-estimates] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent estimates' },
        { status: 500 }
      );
    }

    // Transform data for display
    const estimates = (data || []).map(estimate => {
      const displayName = estimate.full_name ||
        `${estimate.first_name || ''} ${estimate.last_name || ''}`.trim() ||
        'Unknown';

      // Format date for display
      const updatedAt = estimate.updated_at ? new Date(estimate.updated_at) : null;
      const displayDate = updatedAt
        ? updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';

      // Format phone for display
      const phone = estimate.phone || '';
      const isPlaceholder = phone.startsWith('1111111');
      const displayPhone = isPlaceholder ? '' : phone;

      return {
        id: estimate.id,
        quoteId: estimate.quote_id,
        displayName,
        displayPhone,
        displayDate,
        fromAddress: estimate.from_address,
        toAddress: estimate.to_address,
        serviceType: estimate.service_type,
        moveDate: estimate.move_date,
        updatedAt: estimate.updated_at,
      };
    });

    return NextResponse.json(
      { success: true, estimates },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[recent-estimates] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
