import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const WORKIZ_API_KEY = 'api_c3o9qvf0tpw86oqmkygifxjmadj3uvcw';
  const WORKIZ_API_SECRET = 'sec_50925302779624671511000216';
  const WORKIZ_CREATE_JOB_URL = `https://app.workiz.com/api/v1/${WORKIZ_API_KEY}/job/create/`;

  const now = new Date();
  const endDate = new Date(now.getTime() + 60 * 60 * 1000);

  const testJob = {
    FirstName: 'Test',
    LastName: 'FromAPI',
    Phone: '555-333-4444',
    Email: 'testapi@example.com',
    Address: '999 API Test St',
    City: 'Dallas',
    State: 'TX',
    PostalCode: '75201',
    JobType: 'Moving WT',
    JobDateTime: now.toISOString(),
    JobEndDateTime: endDate.toISOString(),
    JobNotes: 'Test from API endpoint',
    auth_secret: WORKIZ_API_SECRET  // HARDCODED
  };

  console.log('[test-workiz] Testing with payload:', JSON.stringify(testJob, null, 2));

  try {
    const response = await fetch(WORKIZ_CREATE_JOB_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(testJob),
    });

    const responseText = await response.text();
    console.log('[test-workiz] Workiz response status:', response.status);
    console.log('[test-workiz] Workiz response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      workizResponse: responseData,
      payloadSent: testJob
    });
  } catch (error) {
    console.error('[test-workiz] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      payloadAttempted: testJob
    }, { status: 500 });
  }
}