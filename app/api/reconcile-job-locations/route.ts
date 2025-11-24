import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Reconcile job_locations table with Workiz
 * Deletes jobs from today that no longer exist in Workiz
 *
 * POST body: { job_numbers: string[] }
 * - job_numbers: Array of valid job numbers from Workiz for today
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const body = await request.json();
    const { job_numbers } = body;

    if (!job_numbers || !Array.isArray(job_numbers)) {
      return NextResponse.json(
        { error: 'job_numbers array is required' },
        { status: 400 }
      );
    }

    // Get today's date in MST timezone
    const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
    const today = mstDate.toISOString().split('T')[0];

    // Convert job_numbers to strings for comparison
    const validJobNumbers = job_numbers.map(jn => String(jn));

    // First, get the orphaned jobs (for logging)
    const { data: orphanedJobs, error: fetchError } = await supabase
      .from('job_locations')
      .select('job_number, customer_name, job_type')
      .eq('scheduled_date', today)
      .not('job_number', 'in', `(${validJobNumbers.join(',')})`);

    if (fetchError) {
      console.error('Error fetching orphaned jobs:', fetchError);
    }

    // Delete orphaned jobs - jobs in Supabase for today that are NOT in Workiz
    let deleteCount = 0;
    let deleteError = null;

    if (validJobNumbers.length > 0) {
      // Use NOT IN to delete jobs not in the valid list
      const { error, count } = await supabase
        .from('job_locations')
        .delete({ count: 'exact' })
        .eq('scheduled_date', today)
        .not('job_number', 'in', `(${validJobNumbers.join(',')})`);

      deleteError = error;
      deleteCount = count || 0;
    } else {
      // If no valid job numbers provided, delete ALL today's jobs
      // (This means Workiz has no jobs for today)
      const { error, count } = await supabase
        .from('job_locations')
        .delete({ count: 'exact' })
        .eq('scheduled_date', today);

      deleteError = error;
      deleteCount = count || 0;
    }

    if (deleteError) {
      console.error('Error deleting orphaned jobs:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete orphaned jobs', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Reconciliation complete`,
      today_date: today,
      valid_job_numbers_count: validJobNumbers.length,
      orphaned_jobs_deleted: deleteCount,
      deleted_jobs: orphanedJobs || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in reconciliation:', error);
    return NextResponse.json(
      {
        error: 'Failed to reconcile job locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be deleted
export async function GET(request: Request) {
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

    // Get all jobs for today
    const { data: todayJobs, count } = await supabase
      .from('job_locations')
      .select('job_number, customer_name, job_type, workiz_job_id', { count: 'exact' })
      .eq('scheduled_date', today);

    return NextResponse.json({
      today_date: today,
      jobs_count: count || 0,
      jobs: todayJobs || [],
      message: 'Use POST with { job_numbers: [...] } to delete orphaned jobs'
    });

  } catch (error) {
    console.error('Error checking jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to check job locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
