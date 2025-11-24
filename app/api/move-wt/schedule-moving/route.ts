import { NextRequest, NextResponse } from 'next/server';

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_API_SECRET = process.env.WORKIZ_API_SECRET || 'sec_50925302779624671511000216';
const WORKIZ_CREATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;
const WORKIZ_UPDATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/update/`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      moveDate,
      moveTime,
      moveDuration,
      firstName,
      lastName,
      phone,
      email,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupZip,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZip,
      timingNotes,
      tags,
    } = body;

    // Validate required fields
    if (!moveDate) {
      return NextResponse.json({ error: 'Move date is required' }, { status: 400 });
    }
    if (!moveTime) {
      return NextResponse.json({ error: 'Move time is required' }, { status: 400 });
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
    if (!pickupAddress) {
      return NextResponse.json({ error: 'Pickup address is required' }, { status: 400 });
    }

    // Calculate end time based on duration (in hours)
    const durationHours = parseInt(moveDuration || '4', 10);
    const startDate = new Date(`${moveDate}T${moveTime}:00`);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    // Format dates in ISO 8601 format as required by Workiz API
    const jobDateTime = startDate.toISOString();
    const jobEndDateTime = endDate.toISOString();

    // Build full pickup address for logging
    const fullPickupAddress = [pickupAddress, pickupCity, pickupState, pickupZip].filter(Boolean).join(', ');
    const fullDeliveryAddress = [deliveryAddress, deliveryCity, deliveryState, deliveryZip].filter(Boolean).join(', ');

    console.log('[schedule-moving] Creating Workiz job:', {
      firstName,
      lastName,
      phone,
      email,
      pickupAddress: fullPickupAddress,
      deliveryAddress: fullDeliveryAddress,
      jobDateTime,
      jobEndDateTime,
      durationHours,
    });

    // Create job in Workiz - using pickup address as primary, delivery in notes
    const workizPayload: Record<string, string | number | string[]> = {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      Email: email,
      Address: pickupAddress,
      City: pickupCity || '',
      State: pickupState || '',
      PostalCode: pickupZip || '',
      JobType: 'Moving',
      JobDateTime: jobDateTime,
      JobEndDateTime: jobEndDateTime,
      JobNotes: timingNotes || '',
      auth_secret: WORKIZ_API_SECRET,
    };

    console.log('[schedule-moving] Sending to Workiz:', WORKIZ_CREATE_JOB_URL);
    console.log('[schedule-moving] Payload:', JSON.stringify(workizPayload, null, 2));

    const workizResponse = await fetch(WORKIZ_CREATE_JOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(workizPayload),
    });

    const responseText = await workizResponse.text();
    console.log('[schedule-moving] Workiz response status:', workizResponse.status);
    console.log('[schedule-moving] Workiz response:', responseText);

    let workizData;
    try {
      workizData = JSON.parse(responseText);
    } catch {
      workizData = { raw: responseText };
    }

    if (!workizResponse.ok) {
      console.error('[schedule-moving] Workiz API error:', workizData);
      return NextResponse.json(
        { error: 'Failed to create job in Workiz', details: workizData, status: workizResponse.status },
        { status: 500 }
      );
    }

    console.log('[schedule-moving] Workiz job created:', workizData);

    // Extract the job UUID from the response
    const jobUUID = workizData.data?.[0]?.UUID || workizData.data?.UUID;

    // Step 2: If tags were selected, update the job with tags (Tags only work on update endpoint)
    let tagsUpdateResult = null;
    if (tags && tags.length > 0 && jobUUID) {
      console.log('[schedule-moving] Tags to add:', tags);
      console.log('[schedule-moving] Job UUID for tag update:', jobUUID);

      // Wait 1 second for Workiz to fully process the job before updating tags
      console.log('[schedule-moving] Waiting 1 second before adding tags...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatePayload = {
        auth_secret: WORKIZ_API_SECRET,
        UUID: jobUUID,
        Tags: tags, // Workiz expects Tags as array: ["tag1", "tag2"]
      };

      console.log('[schedule-moving] Tags update payload:', JSON.stringify(updatePayload, null, 2));

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
        console.log('[schedule-moving] Tags update response status:', updateResponse.status);
        console.log('[schedule-moving] Tags update response:', updateText || '(empty - 204 No Content)');

        if (updateResponse.ok) {
          // 204 No Content or 200 with body are both success responses
          tagsUpdateResult = updateText ? JSON.parse(updateText) : { success: true, status: updateResponse.status };
          console.log('[schedule-moving] Tags added successfully');
        } else {
          try {
            tagsUpdateResult = JSON.parse(updateText);
          } catch {
            tagsUpdateResult = { raw: updateText };
          }
          console.error('[schedule-moving] Failed to add tags:', tagsUpdateResult);
        }
      } catch (tagError) {
        console.error('[schedule-moving] Error updating tags:', tagError);
        tagsUpdateResult = { error: 'Failed to update tags', details: tagError instanceof Error ? tagError.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Moving job scheduled successfully',
      workizJob: workizData,
      tagsUpdate: tagsUpdateResult,
    });

  } catch (error) {
    console.error('[schedule-moving] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
