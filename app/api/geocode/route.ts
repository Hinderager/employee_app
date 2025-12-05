import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST - Geocode an address using Google Maps Geocoding API
 * Requires GOOGLE_MAPS_API_KEY with Geocoding API enabled
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        success: true,
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address
      });
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Geocoding API error:', data.error_message);
      return NextResponse.json(
        {
          success: false,
          error: 'Geocoding API access denied. Please enable Geocoding API in Google Cloud Console.',
          details: data.error_message
        },
        { status: 403 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: `Geocoding failed: ${data.status}`, details: data.error_message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Geocode an address (alternative method via query params)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address query parameter is required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return NextResponse.json({
        success: true,
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address
      });
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Geocoding API error:', data.error_message);
      return NextResponse.json(
        {
          success: false,
          error: 'Geocoding API access denied. Please enable Geocoding API in Google Cloud Console.',
          details: data.error_message
        },
        { status: 403 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: `Geocoding failed: ${data.status}`, details: data.error_message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Geocode API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
