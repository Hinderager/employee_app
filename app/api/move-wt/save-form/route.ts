import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to normalize phone numbers (strips non-numeric characters)
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobNumber, address, formData, folderUrl } = body;

    if (!jobNumber || !jobNumber.trim()) {
      return NextResponse.json(
        { error: 'Job number is required' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Extract and normalize phone number from formData
    const phoneNumber = formData?.phone || '';
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    console.log(`[move-wt/save-form] Saving form for job: ${jobNumber}, address: ${address}, phone: ${normalizedPhone}`);

    // Upsert form data in Supabase
    const { data, error } = await supabase
      .from('move_walkthrough_forms')
      .upsert(
        {
          job_number: jobNumber,
          address: address,
          phone_number: normalizedPhone,
          form_data: formData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'job_number',
        }
      )
      .select();

    if (error) {
      console.error('[move-wt/save-form] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save form data' },
        { status: 500 }
      );
    }

    console.log(`[move-wt/save-form] Form saved successfully`);

    return NextResponse.json({
      success: true,
      message: 'Form saved successfully',
    });

  } catch (error) {
    console.error('[move-wt/save-form] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
