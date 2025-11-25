import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { originLat, originLng, destination } = await request.json();

    if (!originLat || !originLng || !destination) {
      return NextResponse.json(
        { error: 'Origin coordinates and destination are required' },
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

    // Use coordinates for origin to ensure route starts from exact marker location
    const originCoords = `${originLat},${originLng}`;

    // First try the Directions API
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originCoords)}&destination=${encodeURIComponent(destination)}&key=${googleApiKey}`;

    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.status === 'OK') {
      // Directions API worked - return polyline route
      const route = data.routes[0];
      const overviewPolyline = route.overview_polyline.points;
      const legs = route.legs[0];
      const destinationLatLng = legs.end_location;

      return NextResponse.json({
        polyline: overviewPolyline,
        destinationLat: destinationLatLng.lat,
        destinationLng: destinationLatLng.lng,
        distance: legs.distance.text,
        duration: legs.duration.text,
        method: 'directions'
      });
    }

    // Directions API failed - fall back to Geocoding API for destination only
    console.log('[directions] Directions API failed, falling back to geocoding. Status:', data.status);

    // Geocode the destination address
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${googleApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
      console.error('[directions] Geocoding failed:', geocodeData.status);
      return NextResponse.json(
        { error: 'Failed to geocode destination address', details: geocodeData.status },
        { status: 400 }
      );
    }

    const destLocation = geocodeData.results[0].geometry.location;

    // Create a simple encoded polyline for a straight line (origin -> destination)
    // Origin coordinates are already provided, no need to geocode
    const simplePolyline = encodePolyline([
      [originLat, originLng],
      [destLocation.lat, destLocation.lng]
    ]);

    return NextResponse.json({
      polyline: simplePolyline,
      destinationLat: destLocation.lat,
      destinationLng: destLocation.lng,
      distance: 'N/A',
      duration: 'N/A',
      method: 'geocode'
    });

  } catch (error) {
    console.error('[directions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get directions' },
      { status: 500 }
    );
  }
}

// Simple polyline encoder for two points
function encodePolyline(points: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lat, lng] of points) {
    const latE5 = Math.round(lat * 1e5);
    const lngE5 = Math.round(lng * 1e5);

    encoded += encodeSignedNumber(latE5 - prevLat);
    encoded += encodeSignedNumber(lngE5 - prevLng);

    prevLat = latE5;
    prevLng = lngE5;
  }

  return encoded;
}

function encodeSignedNumber(num: number): string {
  let sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~sgn_num;
  }

  let encoded = '';
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);

  return encoded;
}
