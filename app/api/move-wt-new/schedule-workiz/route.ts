import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY!;
const WORKIZ_API_SECRET = process.env.WORKIZ_API_SECRET!;
const WORKIZ_CREATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;
const WORKIZ_UPDATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/update/`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      jobType, // 'moving' or 'walkthrough'
      date,
      time,
      duration,
      firstName,
      lastName,
      phone,
      email,
      fromAddress,
      fromCity,
      fromState,
      fromZip,
      toAddress,
      toCity,
      toState,
      toZip,
      notes,
      tags,
      estimateId, // To update the estimate with workiz job number
    } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    if (!time) {
      return NextResponse.json({ error: 'Time is required' }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Customer first and last name are required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (!fromAddress) {
      return NextResponse.json({ error: 'Pickup/service address is required' }, { status: 400 });
    }

    // Validate tags - minimum 2 required
    if (!tags || tags.length < 2) {
      return NextResponse.json({ error: 'At least 2 tags are required before scheduling' }, { status: 400 });
    }

    // Calculate end time based on duration (in hours for moving, minutes for walkthrough)
    const durationMinutes = jobType === 'walkthrough'
      ? parseInt(duration || '30', 10) // Default 30 min for walkthrough
      : parseInt(duration || '4', 10) * 60; // Default 4 hours for moving

    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Format dates in ISO 8601 format as required by Workiz API
    const jobDateTime = startDate.toISOString();
    const jobEndDateTime = endDate.toISOString();

    // Determine job type for Workiz
    const workizJobType = jobType === 'walkthrough' ? 'Moving WT' : 'Moving';

    // Build the notes with delivery address if provided
    let jobNotes = notes || '';
    if (toAddress && jobType === 'moving') {
      const fullDeliveryAddress = [toAddress, toCity, toState, toZip].filter(Boolean).join(', ');
      jobNotes = `Delivery: ${fullDeliveryAddress}\n\n${jobNotes}`.trim();
    }

    console.log(`[schedule-workiz] Creating ${workizJobType} job:`, {
      firstName,
      lastName,
      phone,
      email,
      fromAddress,
      jobDateTime,
      jobEndDateTime,
      tags,
    });

    // Create job in Workiz
    const workizPayload: Record<string, string | number | string[]> = {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      Email: email || '',
      Address: fromAddress,
      City: fromCity || '',
      State: fromState || '',
      PostalCode: fromZip || '',
      JobType: workizJobType,
      JobDateTime: jobDateTime,
      JobEndDateTime: jobEndDateTime,
      JobNotes: jobNotes,
      auth_secret: WORKIZ_API_SECRET,
    };

    console.log('[schedule-workiz] Sending to Workiz:', WORKIZ_CREATE_JOB_URL);

    const workizResponse = await fetch(WORKIZ_CREATE_JOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(workizPayload),
    });

    const responseText = await workizResponse.text();
    console.log('[schedule-workiz] Workiz response status:', workizResponse.status);
    console.log('[schedule-workiz] Workiz response:', responseText);

    let workizData;
    try {
      workizData = JSON.parse(responseText);
    } catch {
      workizData = { raw: responseText };
    }

    if (!workizResponse.ok) {
      console.error('[schedule-workiz] Workiz API error:', workizData);
      return NextResponse.json(
        { error: 'Failed to create job in Workiz', details: workizData, status: workizResponse.status },
        { status: 500 }
      );
    }

    console.log('[schedule-workiz] Workiz job created:', workizData);

    // Extract the job UUID and job number from the response
    const jobUUID = workizData.data?.[0]?.UUID || workizData.data?.UUID;
    const workizJobNumber = workizData.data?.[0]?.SerialId || workizData.data?.SerialId;

    // Step 2: If tags were selected, update the job with tags
    let tagsUpdateResult = null;
    if (tags && tags.length > 0 && jobUUID) {
      console.log('[schedule-workiz] Tags to add:', tags);
      console.log('[schedule-workiz] Job UUID for tag update:', jobUUID);

      // Wait 1 second for Workiz to fully process the job before updating tags
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatePayload = {
        auth_secret: WORKIZ_API_SECRET,
        UUID: jobUUID,
        Tags: tags,
      };

      try {
        const updateResponse = await fetch(WORKIZ_UPDATE_JOB_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        const updateText = await updateResponse.text();
        console.log('[schedule-workiz] Tags update response status:', updateResponse.status);
        console.log('[schedule-workiz] Tags update response:', updateText || '(empty - 204 No Content)');

        if (updateResponse.ok) {
          tagsUpdateResult = updateText ? JSON.parse(updateText) : { success: true, status: updateResponse.status };
          console.log('[schedule-workiz] Tags added successfully');
        } else {
          try {
            tagsUpdateResult = JSON.parse(updateText);
          } catch {
            tagsUpdateResult = { raw: updateText };
          }
          console.error('[schedule-workiz] Failed to add tags:', tagsUpdateResult);
        }
      } catch (tagError) {
        console.error('[schedule-workiz] Error updating tags:', tagError);
        tagsUpdateResult = { error: 'Failed to update tags', details: tagError instanceof Error ? tagError.message : 'Unknown error' };
      }
    }

    // Step 3: Update the estimate record with the Workiz job number if we have an estimateId
    if (estimateId && workizJobNumber) {
      try {
        const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
        const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase
          .from('move_estimates')
          .update({
            workiz_job_number: workizJobNumber,
            workiz_job_uuid: jobUUID,
            quote_status: 'scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', estimateId);

        console.log('[schedule-workiz] Updated estimate with Workiz job number:', workizJobNumber);
      } catch (supabaseError) {
        console.error('[schedule-workiz] Failed to update estimate:', supabaseError);
        // Don't fail the request - Workiz job was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      message: `${workizJobType} scheduled successfully`,
      workizJob: workizData,
      workizJobNumber,
      jobUUID,
      tagsUpdate: tagsUpdateResult,
    });

  } catch (error) {
    console.error('[schedule-workiz] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
