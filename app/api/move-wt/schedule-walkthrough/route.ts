import { NextRequest, NextResponse } from 'next/server';

// Workiz API credentials
const WORKIZ_API_KEY = process.env.WORKIZ_API_KEY || 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
const WORKIZ_CREATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;

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

    // Parse the date and time to create a proper datetime
    // walkThroughDate is in YYYY-MM-DD format
    // walkThroughTime is in HH:MM format (24-hour)
    const dateTime = `${walkThroughDate} ${walkThroughTime}`;

    // Calculate end time based on duration (in hours)
    const durationHours = parseInt(walkThroughDuration || '1', 10);
    const startDate = new Date(`${walkThroughDate}T${walkThroughTime}:00`);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    // Format end time as HH:MM
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    const endDateTime = `${walkThroughDate} ${endTime}`;

    // Build full address
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');

    console.log('[schedule-walkthrough] Creating Workiz job:', {
      firstName,
      lastName,
      phone,
      email,
      address: fullAddress,
      dateTime,
      endDateTime,
      durationHours,
    });

    // Create job in Workiz
    const workizPayload = {
      FirstName: firstName,
      LastName: lastName,
      Phone: phone,
      Email: email,
      Address: address,
      City: city || '',
      State: state || '',
      Zip: zip || '',
      JobType: 'Move WT',
      JobDateTime: dateTime,
      JobEndDateTime: endDateTime,
      Tags: ['Move', 'WT'],
      JobNotes: `Walk-through scheduled for ${durationHours} hour(s)`,
    };

    const workizResponse = await fetch(WORKIZ_CREATE_JOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(workizPayload),
    });

    const workizData = await workizResponse.json();

    if (!workizResponse.ok) {
      console.error('[schedule-walkthrough] Workiz API error:', workizData);
      return NextResponse.json(
        { error: 'Failed to create job in Workiz', details: workizData },
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
