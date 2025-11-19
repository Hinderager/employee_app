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
    const { firstName, lastName } = body;

    if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    console.log(`[move-wt/find-customer] Searching Workiz for customer: ${firstName} ${lastName}`);

    // Call Workiz API to get all jobs
    const workizResponse = await fetch(WORKIZ_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!workizResponse.ok) {
      const errorText = await workizResponse.text();
      console.error('[move-wt/find-customer] Workiz API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch jobs from Workiz' },
        { status: 500 }
      );
    }

    const workizData = await workizResponse.json();
    const jobs = workizData.data || [];

    console.log(`[move-wt/find-customer] Total jobs in Workiz: ${jobs.length}`);

    // Filter jobs by first and last name (case-insensitive)
    // Also check for partial first name matches (e.g., "Josh" matches "Joshua")
    const matchingJobs = jobs.filter((job: any) => {
      const jobFirstName = (job.FirstName || '').toLowerCase().trim();
      const jobLastName = (job.LastName || '').toLowerCase().trim();
      const searchFirstName = firstName.toLowerCase().trim();
      const searchLastName = lastName.toLowerCase().trim();

      // Exact last name match required
      if (jobLastName !== searchLastName) return false;

      // First name: exact match OR one is a substring of the other
      // This handles "Josh" vs "Joshua", "Mike" vs "Michael", etc.
      const firstNameMatch = jobFirstName === searchFirstName ||
                            jobFirstName.startsWith(searchFirstName) ||
                            searchFirstName.startsWith(jobFirstName);

      if (firstNameMatch) {
        console.log(`[move-wt/find-customer] Match found: ${job.FirstName} ${job.LastName} - Job #${job.SerialId} - ${job.Address || 'No address'}`);
      }

      return firstNameMatch;
    });

    if (matchingJobs.length === 0) {
      console.log(`[move-wt/find-customer] No jobs found in Workiz for: ${firstName} ${lastName}`);
      console.log(`[move-wt/find-customer] Searched ${jobs.length} total jobs`);
      return NextResponse.json(
        { error: 'No jobs found for this customer name' },
        { status: 404 }
      );
    }

    console.log(`[move-wt/find-customer] Found ${matchingJobs.length} job(s) matching ${firstName} ${lastName}`);

    // Format the jobs to return job number and address
    const jobOptions = matchingJobs.map((job: any) => {
      const addressParts = [];
      if (job.Address) addressParts.push(job.Address);
      if (job.City) addressParts.push(job.City);
      if (job.State) addressParts.push(job.State);
      if (job.PostalCode) addressParts.push(job.PostalCode);

      const address = addressParts.join(', ').trim() || job.FullAddress || 'No address';

      return {
        jobNumber: String(job.SerialId),
        address: address,
        jobDateTime: job.JobDateTime || '',
      };
    });

    // Return all matching jobs
    return NextResponse.json({
      success: true,
      multiple: matchingJobs.length > 1,
      jobs: jobOptions,
    });

  } catch (error) {
    console.error('[move-wt/find-customer] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
