import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_API_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/all/`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber } = body;

    if (!jobNumber || !jobNumber.trim()) {
      return NextResponse.json(
        { error: 'Job number is required' },
        { status: 400 }
      );
    }

    console.log(`[load-job] Fetching address for job: ${jobNumber}`);

    // Call Workiz API directly to get all jobs
    const workizResponse = await fetch(WORKIZ_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!workizResponse.ok) {
      const errorText = await workizResponse.text();
      console.error('[load-job] Workiz API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch job details from Workiz' },
        { status: 500 }
      );
    }

    const workizData = await workizResponse.json();

    // Find the job with matching SerialId
    const jobs = workizData.data || [];
    const job = jobs.find((j: any) => String(j.SerialId) === String(jobNumber));

    if (!job) {
      console.error(`[load-job] Job ${jobNumber} not found in Workiz`);
      return NextResponse.json(
        { error: `Job ${jobNumber} not found` },
        { status: 404 }
      );
    }

    // Extract address from Workiz job data
    const addressParts = [];
    if (job.Address) addressParts.push(job.Address);
    if (job.City) addressParts.push(job.City);
    if (job.State) addressParts.push(job.State);
    if (job.Zip) addressParts.push(job.Zip);

    const address = addressParts.join(', ').trim() || job.FullAddress || '';

    if (!address) {
      console.error(`[load-job] No address found for job ${jobNumber}`);
      return NextResponse.json(
        { error: 'Address not found for this job' },
        { status: 404 }
      );
    }

    console.log(`[load-job] Found address: ${address}`);

    // Store job number and address in Supabase (upsert)
    const { data, error } = await supabase
      .from('jobs_from_pictures')
      .upsert(
        {
          job_number: jobNumber,
          address: address,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'job_number',
        }
      )
      .select('job_number, address, google_drive_folder_url, updated_at');

    if (error) {
      console.error('[load-job] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to store job information' },
        { status: 500 }
      );
    }

    console.log(`[load-job] Stored in Supabase:`, data);

    // Return success with address and folder URL if available
    const folderUrl = data && data.length > 0 ? data[0].google_drive_folder_url : null;
    
    return NextResponse.json({
      success: true,
      job_number: jobNumber,
      address: address,
      folderUrl: folderUrl,
    });

  } catch (error) {
    console.error('[load-job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
