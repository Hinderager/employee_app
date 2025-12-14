import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchType, searchValue } = body;

    if (!searchValue || !searchType) {
      return NextResponse.json(
        { error: 'Search type and value are required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
    const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase.from('move_estimates').select('*');

    switch (searchType) {
      case 'phone': {
        // Normalize phone to digits only
        const phoneDigits = searchValue.replace(/\D/g, '');

        // Get all records and filter by normalized phone
        const { data: allRecords, error: fetchError } = await supabase
          .from('move_estimates')
          .select('*')
          .not('phone', 'is', null);

        if (fetchError) {
          console.error('[search] Supabase error:', fetchError);
          return NextResponse.json(
            { error: 'Failed to search estimates' },
            { status: 500 }
          );
        }

        // Find matching record by comparing normalized phone numbers
        const matchingRecords = (allRecords || []).filter(record => {
          const storedDigits = record.phone?.replace(/\D/g, '') || '';
          return storedDigits === phoneDigits || storedDigits.endsWith(phoneDigits) || phoneDigits.endsWith(storedDigits);
        });

        if (matchingRecords.length === 0) {
          return NextResponse.json({ success: true, estimates: [], message: 'No estimates found' });
        }

        // Sort by updated_at descending
        matchingRecords.sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );

        return NextResponse.json({ success: true, estimates: matchingRecords });
      }

      case 'name': {
        // Search by name (partial match on full_name, first_name, or last_name)
        const searchLower = searchValue.toLowerCase();

        const { data: allRecords, error: fetchError } = await supabase
          .from('move_estimates')
          .select('*');

        if (fetchError) {
          console.error('[search] Supabase error:', fetchError);
          return NextResponse.json(
            { error: 'Failed to search estimates' },
            { status: 500 }
          );
        }

        const matchingRecords = (allRecords || []).filter(record => {
          const fullName = (record.full_name || '').toLowerCase();
          const firstName = (record.first_name || '').toLowerCase();
          const lastName = (record.last_name || '').toLowerCase();
          return fullName.includes(searchLower) ||
                 firstName.includes(searchLower) ||
                 lastName.includes(searchLower);
        });

        if (matchingRecords.length === 0) {
          return NextResponse.json({ success: true, estimates: [], message: 'No estimates found' });
        }

        // Sort by updated_at descending
        matchingRecords.sort((a, b) =>
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );

        return NextResponse.json({ success: true, estimates: matchingRecords });
      }

      case 'quoteId': {
        // Search by quote_id (6-character alphanumeric)
        const quoteId = searchValue.toLowerCase().trim();

        const { data, error } = await supabase
          .from('move_estimates')
          .select('*')
          .eq('quote_id', quoteId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[search] Supabase error:', error);
          return NextResponse.json(
            { error: 'Failed to search estimates' },
            { status: 500 }
          );
        }

        if (!data) {
          return NextResponse.json({ success: true, estimates: [], message: 'No estimate found with that quote ID' });
        }

        return NextResponse.json({ success: true, estimates: [data] });
      }

      case 'workizJob': {
        // Search by workiz_job_number field if it exists
        const jobNumber = searchValue.trim();

        const { data, error } = await supabase
          .from('move_estimates')
          .select('*')
          .eq('workiz_job_number', jobNumber);

        if (error) {
          console.error('[search] Supabase error:', error);
          return NextResponse.json(
            { error: 'Failed to search estimates' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, estimates: data || [] });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid search type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[search] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
