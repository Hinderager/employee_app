import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('[move-jobs] Fetching all move jobs...');

    // Fetch all jobs from move_quote table
    const { data: moveQuotes, error: moveQuoteError } = await supabase
      .from('move_quote')
      .select('id, job_number, quote_number, phone_number, address, customer_home_address, form_data, move_date, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (moveQuoteError) {
      console.error('[move-jobs] Supabase error fetching move_quote:', moveQuoteError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    // Fetch all Workiz jobs to get accurate scheduled dates
    const { data: workizJobs, error: workizError } = await supabase
      .from('all_workiz_jobs')
      .select('serial_id, scheduled_date, job_date_time, status, job_type, first_name, last_name, phone, address');

    if (workizError) {
      console.error('[move-jobs] Supabase error fetching all_workiz_jobs:', workizError);
      // Continue without Workiz data - fall back to form data dates
    }

    // Create a map of serial_id -> workiz job for quick lookup
    const workizMap = new Map<number, any>();
    if (workizJobs) {
      workizJobs.forEach((wj: any) => {
        if (wj.serial_id) {
          workizMap.set(wj.serial_id, wj);
        }
      });
    }

    console.log(`[move-jobs] Found ${moveQuotes?.length || 0} move quotes, ${workizJobs?.length || 0} Workiz jobs`);

    // Transform data for the frontend
    const transformedJobs = (moveQuotes || []).map((job: any) => {
      const formData = job.form_data || {};

      // Try to match with Workiz job using job_number (which is serial_id in Workiz)
      const jobNumber = parseInt(job.job_number, 10);
      const workizJob = !isNaN(jobNumber) ? workizMap.get(jobNumber) : null;

      // Use Workiz scheduled_date if available, otherwise fall back to form preferredDate
      let scheduledDate = '';
      if (workizJob?.scheduled_date) {
        scheduledDate = workizJob.scheduled_date;
      } else if (workizJob?.job_date_time) {
        // Extract date from job_date_time if scheduled_date not available
        scheduledDate = workizJob.job_date_time.split('T')[0];
      } else {
        // Fall back to form data
        scheduledDate = formData.preferredDate || '';
      }

      const name = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown';

      // Debug logging
      if (workizJob) {
        console.log(`[move-jobs] Job ${job.job_number} (${name}): Using Workiz date "${scheduledDate}" (status: ${workizJob.status})`);
      } else {
        console.log(`[move-jobs] Job ${job.job_number} (${name}): No Workiz match, using form date "${scheduledDate}"`);
      }

      return {
        id: job.id,
        jobNumber: job.job_number || '',
        quoteNumber: job.quote_number || '',
        customerName: name,
        phone: job.phone_number || formData.phone || '',
        email: formData.email || '',
        pickupAddress: formData.pickupAddress || job.address || '',
        deliveryAddress: formData.deliveryAddress || '',
        serviceType: formData.serviceType || '',
        // Use Workiz scheduled date instead of form preferredDate
        preferredDate: scheduledDate,
        updatedAt: job.updated_at,
        createdAt: job.created_at,
        // Full form data for cut sheet
        formData: formData,
        // Include Workiz data for reference
        workizStatus: workizJob?.status || null,
        workizJobType: workizJob?.job_type || null,
        hasWorkizMatch: !!workizJob,
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
