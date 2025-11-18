import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in MST timezone (YYYY-MM-DD format)
    const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const today = mstDate.toISOString().split('T')[0];

    // Fetch today's scheduled jobs from job_locations table
    const { data: jobs, error } = await supabase
      .from('job_locations')
      .select('*')
      .eq('scheduled_date', today)
      .eq('job_status', 'Submitted')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('job_start_time', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch job locations', details: error.message },
        { status: 500 }
      );
    }

    // Return the jobs with proper cache headers
    return NextResponse.json(
      {
        jobs: jobs || [],
        count: jobs?.length || 0,
        timestamp: new Date().toISOString(),
        date: today
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching job locations:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch job locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}
