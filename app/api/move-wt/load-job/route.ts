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

    console.log(`[move-wt/load-job] Fetching job details for: ${jobNumber}`);

    // Call Workiz API to get all jobs
    const workizResponse = await fetch(WORKIZ_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!workizResponse.ok) {
      const errorText = await workizResponse.text();
      console.error('[move-wt/load-job] Workiz API error:', errorText);
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
      console.error(`[move-wt/load-job] Job ${jobNumber} not found in Workiz`);
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
      console.error(`[move-wt/load-job] No address found for job ${jobNumber}`);
      return NextResponse.json(
        { error: 'Address not found for this job' },
        { status: 404 }
      );
    }

    console.log(`[move-wt/load-job] Found address: ${address}`);

    // Extract customer information from Workiz
    const customerInfo = {
      firstName: job.FirstName || '',
      lastName: job.LastName || '',
      phone: job.Phone || '',
      email: job.Email || '',
      pickupAddress: job.Address || '',
      pickupUnit: '',  // Not in Workiz by default
      pickupCity: job.City || '',
      pickupState: job.State || '',
      pickupZip: job.Zip || '',
    };

    // Get Google Drive folder URL from jobs_from_pictures table
    const { data: picturesData } = await supabase
      .from('jobs_from_pictures')
      .select('google_drive_folder_url')
      .eq('job_number', jobNumber)
      .single();

    const folderUrl = picturesData?.google_drive_folder_url || null;

    // Check if there's existing form data for this address
    const { data: existingFormData } = await supabase
      .from('move_walkthrough_forms')
      .select('*')
      .eq('address', address)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    console.log(`[move-wt/load-job] Existing form data:`, existingFormData ? 'Found' : 'Not found');

    // Return success with all data
    return NextResponse.json({
      success: true,
      job_number: jobNumber,
      address: address,
      customerInfo: customerInfo,
      folderUrl: folderUrl,
      existingFormData: existingFormData?.form_data || null,
    });

  } catch (error) {
    console.error('[move-wt/load-job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
