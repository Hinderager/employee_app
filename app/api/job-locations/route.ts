import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to build full delivery address from form data
function buildDeliveryAddress(formData: any): string | null {
  if (!formData) return null;

  const parts = [];
  if (formData.deliveryAddress) parts.push(formData.deliveryAddress);
  if (formData.deliveryCity) parts.push(formData.deliveryCity);
  if (formData.deliveryState) parts.push(formData.deliveryState);
  if (formData.deliveryZip) parts.push(formData.deliveryZip);

  return parts.length > 0 ? parts.join(', ') : null;
}

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const employeeAppUrl = process.env.EMPLOYEE_APP_SUPABASE_URL;
    const employeeAppKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create client for Employee App database (where move_quote lives)
    const employeeAppSupabase = employeeAppUrl && employeeAppKey
      ? createClient(employeeAppUrl, employeeAppKey)
      : null;

    // Get date from query param or default to today in MST
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let targetDate: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      targetDate = dateParam;
    } else {
      const mstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
      targetDate = mstDate.toISOString().split('T')[0];
    }

    // Fetch scheduled jobs from job_locations table for the target date
    const { data: jobs, error } = await supabase
      .from('job_locations')
      .select('*')
      .eq('scheduled_date', targetDate)
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

    // Enrich jobs with estimate form data if Employee App DB is available
    let enrichedJobs = jobs || [];

    if (employeeAppSupabase && jobs && jobs.length > 0) {
      // Get all job numbers to look up
      const jobNumbers = jobs.map(j => j.job_number);

      // Fetch matching move_quote records
      const { data: quotes, error: quotesError } = await employeeAppSupabase
        .from('move_quote')
        .select('job_number, form_data')
        .in('job_number', jobNumbers);

      if (quotesError) {
        console.error('Error fetching move_quote data:', quotesError);
      } else if (quotes) {
        // Create a map for fast lookup
        const quoteMap = new Map(quotes.map(q => [q.job_number, q.form_data]));

        // Enrich jobs with estimate form data
        enrichedJobs = jobs.map(job => {
          const formData = quoteMap.get(job.job_number);
          if (formData) {
            const deliveryAddress = buildDeliveryAddress(formData);
            const serviceType = formData.serviceType || null;

            // Only add destination if it's a truck job with a valid delivery address
            // that's different from the pickup address
            const hasValidDestination = serviceType === 'truck' &&
              deliveryAddress &&
              deliveryAddress.toLowerCase().trim() !== job.address?.toLowerCase().trim();

            return {
              ...job,
              has_estimate_form: true,
              service_type: serviceType,
              destination_address: hasValidDestination ? deliveryAddress : null
            };
          }
          return {
            ...job,
            has_estimate_form: false,
            service_type: null,
            destination_address: null
          };
        });
      }
    }

    // Return the jobs with proper cache headers
    return NextResponse.json(
      {
        jobs: enrichedJobs,
        count: enrichedJobs.length,
        timestamp: new Date().toISOString(),
        date: targetDate
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
