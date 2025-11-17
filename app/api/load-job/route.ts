import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// n8n webhook URL for fetching job address from Workiz
const N8N_WEBHOOK_URL = 'https://n8n.srv1041426.hstgr.cloud/webhook/employee-app-job-address';

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

    // Call n8n webhook to get job details from Workiz
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_number: jobNumber }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('[load-job] n8n webhook error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch job details from Workiz' },
        { status: 500 }
      );
    }

    const workizData = await n8nResponse.json();

    if (!workizData.success || !workizData.address) {
      console.error('[load-job] No address found:', workizData);
      return NextResponse.json(
        { error: 'Job not found or address missing' },
        { status: 404 }
      );
    }

    const { address } = workizData;

    console.log(`[load-job] Found address: ${address}`);

    // Store job number and address in Supabase (upsert)
    const { data, error } = await supabase
      .from('jobs')
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
      .select();

    if (error) {
      console.error('[load-job] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to store job information' },
        { status: 500 }
      );
    }

    console.log(`[load-job] Stored in Supabase:`, data);

    // Return success with address
    return NextResponse.json({
      success: true,
      job_number: jobNumber,
      address: address,
    });

  } catch (error) {
    console.error('[load-job] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
