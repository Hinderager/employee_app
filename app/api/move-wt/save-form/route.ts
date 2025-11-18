import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side) for Employee App
const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    console.log(`[move-wt/save-form] Saving form for job: ${jobNumber}, address: ${address}`);

    // Generate PDF
    let pdfUrl = null;
    try {
      console.log(`[move-wt/save-form] Generating PDF...`);
      const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/move-wt/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumber,
          address,
          formData,
          folderUrl,
        }),
      });

      if (pdfResponse.ok) {
        const pdfResult = await pdfResponse.json();
        pdfUrl = pdfResult.pdf_url;
        console.log(`[move-wt/save-form] PDF generated successfully: ${pdfUrl}`);
      } else {
        console.error('[move-wt/save-form] PDF generation failed:', await pdfResponse.text());
      }
    } catch (pdfError) {
      console.error('[move-wt/save-form] Error generating PDF:', pdfError);
      // Continue with saving form data even if PDF generation fails
    }

    // Upsert form data in Supabase
    const { data, error } = await supabase
      .from('move_walkthrough_forms')
      .upsert(
        {
          job_number: jobNumber,
          address: address,
          form_data: formData,
          pdf_url: pdfUrl,
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
      pdf_url: pdfUrl,
    });

  } catch (error) {
    console.error('[move-wt/save-form] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
