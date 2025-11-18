import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in MST timezone
    const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const today = mstDate.toISOString().split('T')[0];

    // First, get count of jobs to be deleted
    const { count: deleteCount } = await supabase
      .from('job_locations')
      .select('*', { count: 'exact', head: true })
      .neq('scheduled_date', today);

    // Delete all jobs that are not scheduled for today
    const { error, count } = await supabase
      .from('job_locations')
      .delete({ count: 'exact' })
      .neq('scheduled_date', today);

    if (error) {
      console.error('Error deleting old jobs:', error);
      return NextResponse.json(
        { error: 'Failed to delete old jobs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${count || deleteCount || 0} old jobs`,
      deleted_count: count || deleteCount || 0,
      today_date: today,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in cleanup:', error);
    return NextResponse.json(
      {
        error: 'Failed to cleanup old jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also allow GET for testing
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's date in MST timezone
    const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const today = mstDate.toISOString().split('T')[0];

    // Count jobs that would be deleted
    const { count: oldJobsCount } = await supabase
      .from('job_locations')
      .select('*', { count: 'exact', head: true })
      .neq('scheduled_date', today);

    // Count today's jobs
    const { count: todayJobsCount } = await supabase
      .from('job_locations')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today);

    return NextResponse.json({
      today_date: today,
      jobs_for_today: todayJobsCount || 0,
      old_jobs_to_delete: oldJobsCount || 0,
      message: `Use POST request to delete ${oldJobsCount || 0} old jobs`
    });

  } catch (error) {
    console.error('Error checking old jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to check old jobs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
