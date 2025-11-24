import { NextRequest, NextResponse } from 'next/server';

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_API_SECRET = process.env.WORKIZ_API_SECRET || 'sec_50925302779624671511000216';
// Use app.workiz.com (same as other Workiz routes)
const WORKIZ_CREATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;
const WORKIZ_UPDATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/update/`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      walkThroughDate,
      walkThroughTime,
      walkThroughDuration,
      firstName,
      lastName,
      phone,
      email,
      address,
      city,
      state,
      zip,
      timingNotes,
      tags,
    } = body;

    // Validate required fields
    if (!walkThroughDate) {
      return NextResponse.json({ error: 'Walk-through date is required' }, { status: 400 });
    }
    if (!walkThroughTime) {
      return NextResponse.json({ error: 'Walk-through time is required' }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Customer first and last name are required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Calculate end time based on duration (in hours)
    const durationHours = parseInt(walkThroughDuration || '1', 10);
    const startDate = new Date(`${walkThroughDate}T${walkThroughTime}:00`);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    // Format dates in ISO 8601 format as required by Workiz API
    const jobDateTime = startDate.toISOString();
    const jobEndDateTime = endDate.toISOString();

    // Build full address for logging
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');

    console.log('[schedule-walkthrough] Creating Workiz job:', {
      firstName,
      lastName,
      phone,
      email,
      address: fullAddress,
      jobDateTime,
      jobEndDateTime,
      durationHours,
    });

    // Create job in Workiz - using correct field names per API docs
    const workizPayload: Record<string, string | number | string[]> = {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      Email: email,
      Address: address,
      City: city || '',
      State: state || '',
      PostalCode: zip || '', // API uses PostalCode, not Zip
      JobType: 'Moving WT',
      JobDateTime: jobDateTime,
      JobEndDateTime: jobEndDateTime,
      // Note: Tags are added via a separate update call after job creation
      JobNotes: timingNotes || '',
      auth_secret: WORKIZ_API_SECRET,
    };

    console.log('[schedule-walkthrough] Sending to Workiz:', WORKIZ_CREATE_JOB_URL);
    console.log('[schedule-walkthrough] Payload:', JSON.stringify(workizPayload, null, 2));

    const workizResponse = await fetch(WORKIZ_CREATE_JOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(workizPayload),
    });

    const responseText = await workizResponse.text();
    console.log('[schedule-walkthrough] Workiz response status:', workizResponse.status);
    console.log('[schedule-walkthrough] Workiz response:', responseText);

    let workizData;
    try {
      workizData = JSON.parse(responseText);
    } catch {
      workizData = { raw: responseText };
    }

    if (!workizResponse.ok) {
      console.error('[schedule-walkthrough] Workiz API error:', workizData);
      return NextResponse.json(
        { error: 'Failed to create job in Workiz', details: workizData, status: workizResponse.status },
        { status: 500 }
      );
    }

    console.log('[schedule-walkthrough] Workiz job created:', workizData);

    // Extract the job UUID from the response
    const jobUUID = workizData.data?.[0]?.UUID || workizData.data?.UUID;

    // Step 2: If tags were selected, update the job with tags (Tags only work on update endpoint)
    let tagsUpdateResult = null;
    if (tags && tags.length > 0 && jobUUID) {
      console.log('[schedule-walkthrough] Tags to add:', tags);
      console.log('[schedule-walkthrough] Job UUID for tag update:', jobUUID);

      // Wait 1 second for Workiz to fully process the job before updating tags
      console.log('[schedule-walkthrough] Waiting 1 second before adding tags...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatePayload = {
        auth_secret: WORKIZ_API_SECRET,
        UUID: jobUUID,
        Tags: tags, // Workiz expects Tags as array: ["tag1", "tag2"]
      };

      console.log('[schedule-walkthrough] Tags update payload:', JSON.stringify(updatePayload, null, 2));

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
        console.log('[schedule-walkthrough] Tags update response status:', updateResponse.status);
        console.log('[schedule-walkthrough] Tags update response:', updateText || '(empty - 204 No Content)');

        if (updateResponse.ok) {
          // 204 No Content is a success response
          tagsUpdateResult = updateText ? JSON.parse(updateText) : { success: true, status: updateResponse.status };
          console.log('[schedule-walkthrough] Tags added successfully');
        } else {
          try {
            tagsUpdateResult = JSON.parse(updateText);
          } catch {
            tagsUpdateResult = { raw: updateText };
          }
          console.error('[schedule-walkthrough] Failed to add tags:', tagsUpdateResult);
        }
      } catch (tagError) {
        console.error('[schedule-walkthrough] Error updating tags:', tagError);
        tagsUpdateResult = { error: 'Failed to update tags', details: tagError instanceof Error ? tagError.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Walk-through scheduled successfully',
      workizJob: workizData,
      tagsUpdate: tagsUpdateResult,
    });

  } catch (error) {
    console.error('[schedule-walkthrough] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
