import { NextResponse } from 'next/server';
import { getBouncieToken } from '@/lib/supabase';

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Minimum trip distance in miles to count as a "real" trip
const MIN_TRIP_DISTANCE_MILES = 0.2;

// Vehicle data from OMW Text project
const VEHICLES = [
  {
    name: "Junk Truck",
    imei: "865612071394114",
    color: "#FF6B6B",
    iconUrl: "/icons/junk-truck-icon.png"
  },
  {
    name: "Moving Truck",
    imei: "865612071391698",
    color: "#4ECDC4",
    iconUrl: "/icons/moving-truck-icon.png"
  },
  {
    name: "F-150 Pickup",
    imei: "865612071397489",
    color: "#45B7D1",
    iconUrl: "/icons/f150-icon.png"
  },
  {
    name: "Prius",
    imei: "865612071479667",
    color: "#96CEB4",
    iconUrl: "/icons/prius-icon.png"
  }
];

// Fetch recent trips for a vehicle and find the last trip > 0.2 miles
async function getArrivalTimeFromTrips(imei: string, bouncieToken: string): Promise<string | null> {
  try {
    // Look back 7 days for trips
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const tripsUrl = `https://api.bouncie.dev/v1/trips?imei=${imei}&starts-after=${startDate.toISOString()}&ends-before=${endDate.toISOString()}&gps-format=polyline`;

    const response = await fetch(tripsUrl, {
      headers: {
        'Authorization': bouncieToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const trips = await response.json();

    if (!Array.isArray(trips) || trips.length === 0) {
      return null;
    }

    // Sort trips by end time descending (most recent first)
    const sortedTrips = trips.sort((a: any, b: any) => {
      const endA = new Date(a.endTime || 0).getTime();
      const endB = new Date(b.endTime || 0).getTime();
      return endB - endA;
    });

    // Find the most recent trip that's > 0.2 miles
    for (const trip of sortedTrips) {
      const distance = trip.distance || 0;

      if (distance >= MIN_TRIP_DISTANCE_MILES) {
        // Return the end time of this trip (when vehicle arrived at current location)
        return trip.endTime || null;
      }
    }

    // If no trip > 0.2 miles found, use the most recent trip end time anyway
    return sortedTrips[0]?.endTime || null;

  } catch (error) {
    console.error(`Error fetching trips for ${imei}:`, error);
    return null;
  }
}

export async function GET() {
  try {
    // Get Bouncie access token from Supabase (auto-refreshed by OMW Text n8n workflow)
    let bouncieToken = await getBouncieToken();

    // Fallback to environment variable if Supabase fails
    if (!bouncieToken) {
      console.warn('Failed to get token from Supabase, using environment variable');
      bouncieToken = process.env.BOUNCIE_ACCESS_TOKEN || null;
    }

    if (!bouncieToken) {
      return NextResponse.json(
        { error: 'Bouncie API token not configured' },
        { status: 500 }
      );
    }

    // Fetch all vehicles from Bouncie API
    const response = await fetch('https://api.bouncie.dev/v1/vehicles', {
      headers: {
        'Authorization': bouncieToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bouncie API error: ${response.status} ${response.statusText}`);
    }

    const bouncieData = await response.json();

    // Fetch arrival times for all vehicles in parallel
    const arrivalTimePromises = VEHICLES.map(vehicle =>
      getArrivalTimeFromTrips(vehicle.imei, bouncieToken!)
    );
    const arrivalTimes = await Promise.all(arrivalTimePromises);

    // Map Bouncie data to our vehicle format
    const vehiclesWithLocations = VEHICLES.map((vehicle, index) => {
      // Find matching vehicle in Bouncie data
      const bouncieVehicle = bouncieData.find((bv: any) => bv.imei === vehicle.imei);
      const arrivalTime = arrivalTimes[index];

      if (!bouncieVehicle || !bouncieVehicle.stats?.location) {
        return {
          ...vehicle,
          latitude: 0,
          longitude: 0,
          speed: 0,
          heading: 0,
          timestamp: new Date().toISOString(),
          address: 'Location unavailable',
          isRunning: false,
          fuelLevel: 0,
          arrivalTime: null
        };
      }

      const location = bouncieVehicle.stats.location;

      return {
        ...vehicle,
        latitude: location.lat || 0,
        longitude: location.lon || 0,
        speed: Math.round(bouncieVehicle.stats.speed || 0),
        heading: location.heading || 0,
        timestamp: bouncieVehicle.stats.lastUpdated || new Date().toISOString(),
        address: location.address || 'Address unavailable',
        isRunning: bouncieVehicle.stats.isRunning || false,
        fuelLevel: Math.round(bouncieVehicle.stats.fuelLevel || 0),
        arrivalTime: arrivalTime // Time the vehicle arrived at current location (from last trip > 0.2 miles)
      };
    });

    return NextResponse.json({
      vehicles: vehiclesWithLocations,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error fetching vehicle locations:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch vehicle locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache'
        }
      }
    );
  }
}
