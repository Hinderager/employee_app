import { NextResponse } from 'next/server';
import { getBouncieToken } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Test vehicle IMEI (Junk Truck)
const TEST_IMEI = "865612071394114";

export async function GET() {
  try {
    let bouncieToken = await getBouncieToken();

    if (!bouncieToken) {
      bouncieToken = process.env.BOUNCIE_ACCESS_TOKEN || null;
    }

    if (!bouncieToken) {
      return NextResponse.json({ error: 'No token' }, { status: 500 });
    }

    // Look back 7 days for trips
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const tripsUrl = `https://api.bouncie.dev/v1/trips?imei=${TEST_IMEI}&starts-after=${startDate.toISOString()}&ends-before=${endDate.toISOString()}&gps-format=polyline`;

    const response = await fetch(tripsUrl, {
      headers: {
        'Authorization': bouncieToken,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await response.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = responseText;
    }

    return NextResponse.json({
      url: tripsUrl,
      status: response.status,
      statusText: response.statusText,
      response: parsedResponse,
      firstTrip: Array.isArray(parsedResponse) && parsedResponse.length > 0
        ? parsedResponse[0]
        : null
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
