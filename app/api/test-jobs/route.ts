import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in MST
    const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const today = mstDate.toISOString().split('T')[0];

    // Fetch today's jobs with all details
    const { data: jobs, error } = await supabase
      .from('job_locations')
      .select('*')
      .eq('scheduled_date', today)
      .order('job_start_time', { ascending: true });

    // Also search for Cyndi / job 3121
    const { data: cyndiJob, error: cyndiError } = await supabase
      .from('job_locations')
      .select('*')
      .or('job_number.eq.3121,customer_name.ilike.%cyndi%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return raw data for debugging
    return NextResponse.json({
      today,
      count: jobs?.length || 0,
      jobs: jobs?.map(job => ({
        job_number: job.job_number,
        job_start_time: job.job_start_time,
        customer_name: job.customer_name,
        raw_job: job
      })) || [],
      cyndi_search: {
        found: cyndiJob?.length || 0,
        jobs: cyndiJob || [],
        error: cyndiError?.message || null
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
