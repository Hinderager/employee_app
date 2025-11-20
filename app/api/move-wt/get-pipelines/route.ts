import { NextRequest, NextResponse } from 'next/server';

// GHL Configuration
const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export async function GET(request: NextRequest) {
  try {
    console.log('[get-pipelines] Fetching pipelines from GHL...');

    const response = await fetch(
      `${GHL_API_BASE}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[get-pipelines] GHL API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      return NextResponse.json(
        { error: `Failed to fetch pipelines: ${response.statusText}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[get-pipelines] Successfully fetched pipelines');

    // Format the response for easy reading
    const pipelines = data.pipelines || [];
    const formatted = pipelines.map((pipeline: any) => ({
      id: pipeline.id,
      name: pipeline.name,
      stages: pipeline.stages?.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
      })) || [],
    }));

    return NextResponse.json({
      success: true,
      pipelines: formatted,
      rawData: data,
    });

  } catch (error) {
    console.error('[get-pipelines] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
