import { NextResponse } from 'next/server';

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
    // Get Bouncie access token from environment
    const bouncieToken = process.env.BOUNCIE_ACCESS_TOKEN;

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

    // Map Bouncie data to our vehicle format
    const vehiclesWithLocations = VEHICLES.map(vehicle => {
      // Find matching vehicle in Bouncie data
      const bouncieVehicle = bouncieData.find((bv: any) => bv.imei === vehicle.imei);

      if (!bouncieVehicle || !bouncieVehicle.stats?.location) {
        return {
          ...vehicle,
          latitude: 0,
          longitude: 0,
          speed: 0,
          heading: 0,
          timestamp: new Date().toISOString(),
          address: 'Location unavailable',
          isRunning: false
        };
      }

      const location = bouncieVehicle.stats.location;

      return {
        ...vehicle,
        latitude: location.lat || 0,
        longitude: location.lon || 0,
        speed: Math.round(location.speed || 0),
        heading: location.heading || 0,
        timestamp: location.timestamp || new Date().toISOString(),
        address: location.address || 'Address unavailable',
        isRunning: bouncieVehicle.stats.isRunning || false
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
