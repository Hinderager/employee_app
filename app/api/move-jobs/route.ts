import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('[move-jobs] Fetching all move jobs...');

    // Fetch all jobs from move_quote table, ordered by most recent
    // Explicitly select move_date column to ensure it's included
    const { data: jobs, error } = await supabase
      .from('move_quote')
      .select('id, job_number, quote_number, phone_number, address, customer_home_address, form_data, move_date, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[move-jobs] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    console.log(`[move-jobs] Found ${jobs?.length || 0} jobs`);

    // Debug: log first job's raw columns
    if (jobs && jobs.length > 0) {
      console.log('[move-jobs] First job columns:', Object.keys(jobs[0]));
      console.log('[move-jobs] First job move_date RAW:', jobs[0].move_date, 'type:', typeof jobs[0].move_date);
    }

    // Transform data for the frontend
    const transformedJobs = (jobs || []).map((job: any) => {
      const formData = job.form_data || {};

      // Debug: log job details
      const name = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown';
      console.log(`[move-jobs] Job ${job.job_number} (${name}): move_date = "${job.move_date}", preferredDate = "${formData.preferredDate || ''}"`);

      return {
        id: job.id,
        jobNumber: job.job_number || '',
        quoteNumber: job.quote_number || '',
        customerName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown',
        phone: job.phone_number || formData.phone || '',
        email: formData.email || '',
        pickupAddress: formData.pickupAddress || job.address || '',
        deliveryAddress: formData.deliveryAddress || '',
        serviceType: formData.serviceType || '',
        preferredDate: formData.preferredDate || '',
        updatedAt: job.updated_at,
        createdAt: job.created_at,
        // Full form data for cut sheet
        formData: formData,
      };
    });

    return NextResponse.json({
      success: true,
      jobs: transformedJobs,
    });

  } catch (error) {
    console.error('[move-jobs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
