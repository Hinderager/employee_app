import { NextResponse } from 'next/server';
import { getBouncieToken } from '@/lib/supabase';

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

    // DEBUG: Log the full Bouncie API response structure
    console.log('=== BOUNCIE API DEBUG ===');
    console.log('Number of vehicles returned:', bouncieData.length);
    console.log('Full Bouncie response:', JSON.stringify(bouncieData, null, 2));

    // Map Bouncie data to our vehicle format
    const vehiclesWithLocations = VEHICLES.map(vehicle => {
      // Find matching vehicle in Bouncie data
      const bouncieVehicle = bouncieData.find((bv: any) => bv.imei === vehicle.imei);

      // DEBUG: Log each vehicle's data structure
      console.log(`\n--- Vehicle: ${vehicle.name} (${vehicle.imei}) ---`);
      if (bouncieVehicle) {
        console.log('Found in Bouncie data:', JSON.stringify(bouncieVehicle, null, 2));
        console.log('Has stats?', !!bouncieVehicle.stats);
        console.log('Has stats.location?', !!bouncieVehicle.stats?.location);
        if (bouncieVehicle.stats) {
          console.log('Stats keys:', Object.keys(bouncieVehicle.stats));
        }
      } else {
        console.log('NOT FOUND in Bouncie data');
      }

      if (!bouncieVehicle || !bouncieVehicle.stats?.location) {
        console.log(`⚠️ RETURNING 0,0 for ${vehicle.name} - no location data`);
        return {
          ...vehicle,
          latitude: 0,
          longitude: 0,
          speed: 0,
          heading: 0,
          timestamp: new Date().toISOString(),
          address: 'Location unavailable',
          isRunning: false,
          fuelLevel: 0
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
        fuelLevel: Math.round(bouncieVehicle.stats.fuelLevel || 0)
      };
    });

    return NextResponse.json({
      vehicles: vehiclesWithLocations,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching vehicle locations:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch vehicle locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
