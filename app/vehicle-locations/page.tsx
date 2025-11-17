"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

interface VehicleLocation {
  name: string;
  imei: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
  address: string;
  isRunning: boolean;
  fuelLevel: number;
  color: string;
  iconUrl: string;
}

export default function VehicleLocationsPage() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);
  const followingVehicleRef = useRef<string | null>(null); // Track which vehicle to follow (by IMEI)
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [followingVehicle, setFollowingVehicle] = useState<string | null>(null); // Track for UI highlighting
  const [mapReady, setMapReady] = useState(false); // Track when map is initialized

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Load Leaflet JS
      if (!(window as any).L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else {
        initMap();
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  const initMap = () => {
    if (mapRef.current) return; // Already initialized

    const L = (window as any).L;
    if (!L) return;

    // Create map with temporary center (will auto-fit to vehicles once loaded)
    const map = L.map("map", {
      center: [43.65, -116.42],  // Meridian, ID area (where vehicles are)
      zoom: 13,
      zoomControl: true
    });

    // Add CartoDB Voyager tile layer (same as OMW Text)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19
      }
    ).addTo(map);

    mapRef.current = map;

    // Stop following vehicle when map is dragged or zoomed manually
    map.on('dragstart', () => {
      followingVehicleRef.current = null;
      setFollowingVehicle(null);
    });
    map.on('zoomstart', () => {
      followingVehicleRef.current = null;
      setFollowingVehicle(null);
    });

    // Start fetching vehicle locations immediately
    fetchVehicleLocations();

    // Mark map as ready to trigger interval setup
    setMapReady(true);
  };

  // Auto-refresh vehicle locations every 5 seconds
  useEffect(() => {
    if (!mapReady) return; // Wait for map to be initialized

    // Set up interval to fetch locations
    const interval = setInterval(fetchVehicleLocations, 5000);

    // Clean up interval when component unmounts
    return () => {
      clearInterval(interval);
    };
  }, [mapReady]);

  // Fetch all vehicle locations
  const fetchVehicleLocations = async () => {
    try {
      // Call the Bouncie API endpoint
      const response = await fetch("/api/vehicles/all");

      if (!response.ok) {
        throw new Error("Failed to fetch vehicle locations");
      }

      const data = await response.json();
      setVehicles(data.vehicles);
      setLastUpdate(new Date());
      setLoading(false);
      setError(null);

      // Update map markers
      updateMapMarkers(data.vehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Update markers on map
  const updateMapMarkers = (vehicleData: VehicleLocation[]) => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers for each vehicle (skip vehicles with no valid location)
    vehicleData.forEach(vehicle => {
      if (vehicle.latitude && vehicle.longitude &&
          vehicle.latitude !== 0 && vehicle.longitude !== 0) {
        // Create custom icon using image (same as OMW Text project)
        const customIcon = L.icon({
          iconUrl: vehicle.iconUrl,
          iconSize: [75, 75],           // Same size as OMW Text
          iconAnchor: [75/2, 75],       // Bottom-center positioning (same as OMW Text)
          popupAnchor: [0, -75]         // Popup above icon (same as OMW Text)
        });

        const marker = L.marker([vehicle.latitude, vehicle.longitude], {
          icon: customIcon
        }).addTo(mapRef.current);

        // Add click handler to follow this vehicle
        marker.on('click', () => {
          followingVehicleRef.current = vehicle.imei;
          setFollowingVehicle(vehicle.imei);
          mapRef.current.setView([vehicle.latitude, vehicle.longitude], 16);
        });

        // Add popup with vehicle info
        const fuelIcon = vehicle.fuelLevel > 50 ? '⛽' : vehicle.fuelLevel > 25 ? '🟡' : '🔴';
        const popupContent = `
          <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${vehicle.color};">
              ${vehicle.name}
            </h3>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Speed:</strong> ${vehicle.speed} mph
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Status:</strong> ${vehicle.isRunning ? '🟢 Running' : '🔴 Stopped'}
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Fuel:</strong> ${fuelIcon} ${vehicle.fuelLevel}%
            </p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              ${vehicle.address || 'Address unavailable'}
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #999;">
              Updated: ${new Date(vehicle.timestamp).toLocaleTimeString()}
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #999;">
              <em>Click marker to follow vehicle</em>
            </p>
          </div>
        `;

        marker.bindPopup(popupContent, {
          autoClose: false,      // Don't auto-close when another popup opens
          closeOnClick: true,    // Close when clicking map (outside the pin)
          closeButton: true,     // Show X button to close
          autoPan: true,         // Auto-pan map to show popup
          maxWidth: 300          // Max width for popup
        });
        markersRef.current.push(marker);
      }
    });

    // Auto-fit map to show all vehicles ONLY on first load
    if (markersRef.current.length > 0 && isFirstLoadRef.current) {
      try {
        const group = L.featureGroup(markersRef.current);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.log('Unable to fit bounds on initial load:', error);
      }
      isFirstLoadRef.current = false; // Disable auto-fit after first load
    }

    // If following a vehicle, center on it
    if (followingVehicleRef.current) {
      const followedVehicle = vehicleData.find(v => v.imei === followingVehicleRef.current);
      if (followedVehicle && followedVehicle.latitude && followedVehicle.longitude) {
        mapRef.current.setView([followedVehicle.latitude, followedVehicle.longitude], mapRef.current.getZoom());
      }
    }
  };

  // Handle clicking a vehicle icon in the bottom nav
  const handleVehicleClick = (imei: string) => {
    const vehicle = vehicles.find(v => v.imei === imei);
    if (vehicle && vehicle.latitude && vehicle.longitude && mapRef.current) {
      followingVehicleRef.current = imei;
      setFollowingVehicle(imei);
      mapRef.current.setView([vehicle.latitude, vehicle.longitude], 16);
    }
  };

  // Handle clicking "All Vehicles" button - show all vehicles (same as initial load)
  const handleShowAllVehicles = () => {
    const L = (window as any).L;

    // Stop following any vehicle
    followingVehicleRef.current = null;
    setFollowingVehicle(null);

    // Fit bounds to show all vehicles (same as initial load)
    if (markersRef.current.length > 0 && L && mapRef.current) {
      if (markersRef.current.length === 1) {
        // If only one marker, just center on it
        const latLng = markersRef.current[0].getLatLng();
        mapRef.current.setView(latLng, 13);
      } else {
        // If multiple markers, fit bounds
        try {
          const group = L.featureGroup(markersRef.current);
          mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
        } catch (error) {
          console.log('Unable to fit bounds, centering on first vehicle:', error);
          // Fallback: center on first marker
          const latLng = markersRef.current[0].getLatLng();
          mapRef.current.setView(latLng, 13);
        }
      }
    }
  };

  return (
    <div className="h-screen w-screen relative">
      {/* Menu Button - Top Left */}
      <Link
        href="/home"
        className="fixed top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 transition-all hover:scale-105"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="font-medium text-gray-900">Menu</span>
      </Link>

      {/* Map Container - Full Screen */}
      <div id="map" className="h-full w-full"></div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg z-[1000]">
        <div className="flex justify-around items-center px-4 py-3">
          {/* Individual Vehicle Icons */}
          {VEHICLES.map((vehicle) => {
            // Use small nav icons for the bottom bar
            const navIconUrl = vehicle.iconUrl.replace('-icon.png', '-nav.png');
            return (
              <button
                key={vehicle.imei}
                onClick={() => handleVehicleClick(vehicle.imei)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  followingVehicle === vehicle.imei
                    ? 'bg-blue-100 scale-110'
                    : 'hover:bg-gray-100'
                }`}
                title={`Go to ${vehicle.name}`}
              >
                <img
                  src={navIconUrl}
                  alt={vehicle.name}
                  className="w-12 h-12 object-contain"
                />
                <span className="text-xs mt-1 font-medium text-black">
                  {vehicle.name.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* All Vehicles Button */}
          <button
            onClick={handleShowAllVehicles}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              followingVehicle === null
                ? 'bg-blue-100 scale-110'
                : 'hover:bg-gray-100'
            }`}
            title="Show all vehicles"
          >
            <svg
              className="w-12 h-12"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            <span className="text-xs mt-1 font-medium text-gray-700">All</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        .vehicle-marker {
          background: transparent;
          border: none;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }

        .leaflet-popup-content {
          margin: 12px;
        }

        /* Move zoom controls below menu button */
        .leaflet-top.leaflet-left {
          top: 70px !important;
        }
      `}</style>
    </div>
  );
}
