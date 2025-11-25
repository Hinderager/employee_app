import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('[directions] Google Maps API key not found');
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Use Google Maps Directions API to get the route
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${googleApiKey}`;

    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('[directions] API returned non-OK status:', data.status);
      return NextResponse.json(
        { error: 'Failed to get directions', details: data.status },
        { status: 400 }
      );
    }

    // Extract the route polyline and destination coordinates
    const route = data.routes[0];
    const overviewPolyline = route.overview_polyline.points;
    const legs = route.legs[0];
    const destinationLatLng = legs.end_location;

    return NextResponse.json({
      polyline: overviewPolyline,
      destinationLat: destinationLatLng.lat,
      destinationLng: destinationLatLng.lng,
      distance: legs.distance.text,
      duration: legs.duration.text
    });

  } catch (error) {
    console.error('[directions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get directions' },
      { status: 500 }
    );
  }
}
