import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering (uses request.url)
export const dynamic = 'force-dynamic';
// Disable all caching completely
export const revalidate = 0;
// Force no store for all fetch requests
export const fetchCache = 'force-no-store';


export async function GET(request: NextRequest) {
  try {
    // Get the limit from query params, default to 6
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    // Initialize Supabase client inside the function to avoid Vercel env var caching bug
    // This ensures fresh environment variables on every request
    const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
    const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);


    // Fetch the most recent move quotes
    const { data, error } = await supabase
      .from('move_quote')
      .select('id, quote_number, job_number, customer_home_address, phone_number, form_data, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[recent-forms] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch recent forms' },
        { status: 500 }
      );
    }

    // Transform data to include displayable info
    const forms = (data || []).map(form => {
      const formData = form.form_data || {};
      const firstName = formData.firstName || '';
      const lastName = formData.lastName || '';
      const displayName = `${firstName} ${lastName}`.trim() || 'Unknown';

      // Format date for display
      const updatedAt = form.updated_at ? new Date(form.updated_at) : null;
      const displayDate = updatedAt
        ? updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';

      return {
        id: form.id,
        quoteNumber: form.quote_number,
        jobNumber: form.job_number,
        customerHomeAddress: form.customer_home_address,
        phoneNumber: form.phone_number,
        displayName,
        displayDate,
        updatedAt: form.updated_at,
      };
    });

    // Return with aggressive no-cache headers
    return NextResponse.json(
      {
        success: true,
        forms,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store',
        },
      }
    );

  } catch (error) {
    console.error('[recent-forms] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
