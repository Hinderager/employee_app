import { NextRequest, NextResponse } from 'next/server';

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_AUTH_SECRET = process.env.WORKIZ_AUTH_SECRET || '';
// Use api.workiz.com (not app.workiz.com)
const WORKIZ_CREATE_JOB_URL = `https://api.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;

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
    const workizPayload: Record<string, string | number> = {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      Email: email,
      Address: address,
      City: city || '',
      State: state || '',
      PostalCode: zip || '', // API uses PostalCode, not Zip
      JobType: 'Move WT',
      JobDateTime: jobDateTime,
      JobEndDateTime: jobEndDateTime,
      JobNotes: `Walk-through scheduled for ${durationHours} hour(s)`,
    };

    // Add auth_secret if available (required by Workiz API)
    if (WORKIZ_AUTH_SECRET) {
      workizPayload.auth_secret = WORKIZ_AUTH_SECRET;
    }

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

    return NextResponse.json({
      success: true,
      message: 'Walk-through scheduled successfully',
      workizJob: workizData,
    });

  } catch (error) {
    console.error('[schedule-walkthrough] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
