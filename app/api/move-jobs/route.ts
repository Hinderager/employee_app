import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize phone number - strip all non-digits
const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  return phone.replace(/D/g, '');
};

export async function GET(request: NextRequest) {
  try {
    // Get date from query parameter, default to today (in MST)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Get today's date in MST (UTC-7)
    const now = new Date();
    const mstOffset = -7 * 60; // MST is UTC-7
    const mstTime = new Date(now.getTime() + (mstOffset - now.getTimezoneOffset()) * 60000);
    const todayMST = mstTime.toISOString().split('T')[0];

    const selectedDate = dateParam || todayMST;
    console.log(`[move-jobs] Fetching jobs for date: ${selectedDate}`);

    // Fetch Workiz jobs for the selected date with job_type "Moving" or "Moving WT"
    const { data: workizJobs, error: workizError } = await supabase
      .from('all_workiz_jobs')
      .select('serial_id, scheduled_date, job_date_time, status, job_type, first_name, last_name, phone, address')
      .eq('scheduled_date', selectedDate)
      .or('job_type.eq.Moving,job_type.eq.Moving WT');

    if (workizError) {
      console.error('[move-jobs] Supabase error fetching all_workiz_jobs:', workizError);
      return NextResponse.json(
        { error: 'Failed to fetch Workiz jobs' },
        { status: 500 }
      );
    }

    console.log(`[move-jobs] Found ${workizJobs?.length || 0} Workiz Moving jobs for ${selectedDate}`);

    // If no Workiz jobs for today, return empty
    if (!workizJobs || workizJobs.length === 0) {
      return NextResponse.json({
        success: true,
        jobs: [],
        date: selectedDate,
      });
    }

    // Create a set of normalized Workiz phone numbers for matching
    const workizPhoneMap = new Map<string, any>();
    workizJobs.forEach((wj: any) => {
      const normalizedPhone = normalizePhone(wj.phone);
      if (normalizedPhone) {
        workizPhoneMap.set(normalizedPhone, wj);
        console.log(`[move-jobs] Workiz job ${wj.serial_id} (${wj.first_name} ${wj.last_name}): phone ${normalizedPhone}`);
      }
    });

    // Fetch all estimate forms from move_quote table
    const { data: moveQuotes, error: moveQuoteError } = await supabase
      .from('move_quote')
      .select('id, job_number, quote_number, phone_number, address, customer_home_address, form_data, move_date, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (moveQuoteError) {
      console.error('[move-jobs] Supabase error fetching move_quote:', moveQuoteError);
      return NextResponse.json(
        { error: 'Failed to fetch estimate forms' },
        { status: 500 }
      );
    }

    console.log(`[move-jobs] Found ${moveQuotes?.length || 0} estimate forms to search`);

    // Match estimate forms to Workiz jobs by phone number
    const matchedJobs: any[] = [];
    const matchedWorkizIds = new Set<number>();

    (moveQuotes || []).forEach((form: any) => {
      const formData = form.form_data || {};

      // Collect all phone numbers from the form
      const formPhones: string[] = [];

      // Add phone_number field
      if (form.phone_number) {
        formPhones.push(normalizePhone(form.phone_number));
      }

      // Add form_data.phone
      if (formData.phone) {
        formPhones.push(normalizePhone(formData.phone));
      }

      // Add all phones from form_data.phones array
      if (Array.isArray(formData.phones)) {
        formData.phones.forEach((p: any) => {
          if (p?.number) {
            formPhones.push(normalizePhone(p.number));
          }
        });
      }

      // Remove duplicates and empty strings
      const uniquePhones = [...new Set(formPhones)].filter(p => p.length > 0);

      // Check if any form phone matches a Workiz phone
      for (const phone of uniquePhones) {
        const workizJob = workizPhoneMap.get(phone);
        if (workizJob && !matchedWorkizIds.has(workizJob.serial_id)) {
          matchedWorkizIds.add(workizJob.serial_id);

          const name = `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Unknown';

          console.log(`[move-jobs] MATCH: Form ${form.id} (${name}) matched Workiz ${workizJob.serial_id} via phone ${phone}`);

          matchedJobs.push({
            id: form.id,
            jobNumber: String(workizJob.serial_id),
            quoteNumber: form.quote_number || '',
            customerName: name,
            phone: form.phone_number || formData.phone || '',
            email: formData.email || '',
            pickupAddress: formData.pickupAddress || form.address || '',
            deliveryAddress: formData.deliveryAddress || '',
            serviceType: formData.serviceType || '',
            // Use Workiz scheduled date
            preferredDate: workizJob.scheduled_date,
            updatedAt: form.updated_at,
            createdAt: form.created_at,
            // Full form data for cut sheet
            formData: formData,
            // Include Workiz data for reference
            workizStatus: workizJob.status,
            workizJobType: workizJob.job_type,
            workizSerialId: workizJob.serial_id,
            hasWorkizMatch: true,
          });
          break; // Only match once per form
        }
      }
    });

    console.log(`[move-jobs] Returning ${matchedJobs.length} matched jobs for ${selectedDate}`);

    return NextResponse.json({
      success: true,
      jobs: matchedJobs,
      date: selectedDate,
    });

  } catch (error) {
    console.error('[move-jobs] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
