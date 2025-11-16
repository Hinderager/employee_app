"use client";

import { useEffect, useRef, useState } from "react";

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
  color: string;
  iconUrl: string;
}

export default function VehicleLocationsPage() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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

    // Start fetching vehicle locations
    fetchVehicleLocations();

    // Auto-refresh every 5 seconds (same as OMW Text)
    const interval = setInterval(fetchVehicleLocations, 5000);

    return () => clearInterval(interval);
  };

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

    // Add new markers for each vehicle
    vehicleData.forEach(vehicle => {
      if (vehicle.latitude && vehicle.longitude) {
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

        // Add popup with vehicle info
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
            <p style="margin: 4px 0; font-size: 12px; color: #666;">
              ${vehicle.address || 'Address unavailable'}
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #999;">
              Updated: ${new Date(vehicle.timestamp).toLocaleTimeString()}
            </p>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      }
    });

    // Auto-fit map to show all vehicles
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  return (
    <div className="h-screen w-screen relative">
      {/* Map Container - Full Screen */}
      <div id="map" className="h-full w-full"></div>

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
      `}</style>
    </div>
  );
}
