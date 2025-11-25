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
  arrivalTime: string | null; // Time vehicle arrived at current location (from API)
}

// Asymmetric padding: more at top (header) and bottom (footer nav)
const MAP_PADDING_TOP_LEFT = [50, 140];     // [left, top] - account for header
const MAP_PADDING_BOTTOM_RIGHT = [50, 180]; // [right, bottom] - account for footer nav bar

// Format duration for display
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return "Just arrived";
  }
}

// Format idle duration (minutes only, simpler format)
function formatIdleDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  } else {
    return "<1m";
  }
}

export default function VehicleLocationsPage() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const isFirstLoadRef = useRef<boolean>(true);
  const followingVehicleRef = useRef<string | null>(null);
  const idleStartTimesRef = useRef<Map<string, Date>>(new Map()); // Track when each vehicle started idling
  const isProgrammaticMoveRef = useRef<boolean>(false); // Flag to prevent clearing selection during programmatic map moves

  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [followingVehicle, setFollowingVehicle] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date()); // For updating time displays
  const [idleTimes, setIdleTimes] = useState<Map<string, number>>(new Map());

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

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

  const initMap = () => {
    if (mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map("map", {
      center: [43.65, -116.42],
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19
      }
    ).addTo(map);

    mapRef.current = map;

    // Only clear selection on manual drag/zoom, not programmatic moves
    map.on('dragstart', () => {
      if (!isProgrammaticMoveRef.current) {
        followingVehicleRef.current = null;
        setFollowingVehicle(null);
      }
    });
    map.on('zoomstart', () => {
      if (!isProgrammaticMoveRef.current) {
        followingVehicleRef.current = null;
        setFollowingVehicle(null);
      }
    });

    fetchVehicleLocations();
    setMapReady(true);
  };

  useEffect(() => {
    if (!mapReady) return;
    const interval = setInterval(fetchVehicleLocations, 5000);
    return () => clearInterval(interval);
  }, [mapReady]);

  // Update current time every second for duration displays
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Update idle times
      const newIdleTimes = new Map<string, number>();
      idleStartTimesRef.current.forEach((startTime, imei) => {
        newIdleTimes.set(imei, now.getTime() - startTime.getTime());
      });
      setIdleTimes(newIdleTimes);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchVehicleLocations = async () => {
    try {
      const response = await fetch("/api/vehicles/all");
      if (!response.ok) throw new Error("Failed to fetch vehicle locations");

      const data = await response.json();

      // Update idle tracking
      updateIdleTracking(data.vehicles);

      setVehicles(data.vehicles);
      setLastUpdate(new Date());
      setLoading(false);
      setError(null);
      updateMapMarkers(data.vehicles);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Track when vehicles start/stop idling (running but speed = 0)
  const updateIdleTracking = (vehicleData: VehicleLocation[]) => {
    const now = new Date();

    vehicleData.forEach(vehicle => {
      const isIdling = vehicle.isRunning && vehicle.speed === 0;
      const currentlyTrackedAsIdling = idleStartTimesRef.current.has(vehicle.imei);

      if (isIdling && !currentlyTrackedAsIdling) {
        // Vehicle just started idling
        idleStartTimesRef.current.set(vehicle.imei, now);
      } else if (!isIdling && currentlyTrackedAsIdling) {
        // Vehicle stopped idling (either moving or turned off)
        idleStartTimesRef.current.delete(vehicle.imei);
      }
    });
  };

  const updateMapMarkers = (vehicleData: VehicleLocation[]) => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const seenImeis = new Set<string>();

    vehicleData.forEach(vehicle => {
      if (vehicle.latitude && vehicle.longitude &&
          vehicle.latitude !== 0 && vehicle.longitude !== 0) {

        seenImeis.add(vehicle.imei);
        const existingMarker = markersRef.current.get(vehicle.imei);

        if (existingMarker) {
          existingMarker.setLatLng([vehicle.latitude, vehicle.longitude]);
        } else {
          const customIcon = L.icon({
            iconUrl: vehicle.iconUrl,
            iconSize: [75, 75],
            iconAnchor: [75/2, 75],
            popupAnchor: [0, -75]
          });

          const marker = L.marker([vehicle.latitude, vehicle.longitude], {
            icon: customIcon
          }).addTo(mapRef.current);

          // Click to select and follow vehicle (no popup)
          marker.on('click', () => {
            followingVehicleRef.current = vehicle.imei;
            setFollowingVehicle(vehicle.imei);
            isProgrammaticMoveRef.current = true;
            mapRef.current.setView([vehicle.latitude, vehicle.longitude], 16);
            setTimeout(() => { isProgrammaticMoveRef.current = false; }, 100);
          });

          markersRef.current.set(vehicle.imei, marker);
        }
      }
    });

    markersRef.current.forEach((marker, imei) => {
      if (!seenImeis.has(imei)) {
        marker.remove();
        markersRef.current.delete(imei);
      }
    });

    if (markersRef.current.size > 0 && isFirstLoadRef.current) {
      try {
        const markersArray = Array.from(markersRef.current.values());
        const group = L.featureGroup(markersArray);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          isProgrammaticMoveRef.current = true;
          mapRef.current.fitBounds(bounds, {
            paddingTopLeft: MAP_PADDING_TOP_LEFT,
            paddingBottomRight: MAP_PADDING_BOTTOM_RIGHT
          });
          setTimeout(() => { isProgrammaticMoveRef.current = false; }, 100);
        }
      } catch (error) {
        console.log('Unable to fit bounds on initial load:', error);
      }
      isFirstLoadRef.current = false;
    }

    if (followingVehicleRef.current) {
      const followedVehicle = vehicleData.find(v => v.imei === followingVehicleRef.current);
      if (followedVehicle && followedVehicle.latitude && followedVehicle.longitude) {
        isProgrammaticMoveRef.current = true;
        mapRef.current.setView([followedVehicle.latitude, followedVehicle.longitude], mapRef.current.getZoom());
        setTimeout(() => { isProgrammaticMoveRef.current = false; }, 100);
      }
    }
  };

  const handleVehicleClick = (imei: string) => {
    const vehicle = vehicles.find(v => v.imei === imei);
    if (vehicle && vehicle.latitude && vehicle.longitude && mapRef.current) {
      followingVehicleRef.current = imei;
      setFollowingVehicle(imei);
      isProgrammaticMoveRef.current = true;
      mapRef.current.setView([vehicle.latitude, vehicle.longitude], 16);
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 100);
    }
  };

  const handleShowAllVehicles = () => {
    const L = (window as any).L;
    followingVehicleRef.current = null;
    setFollowingVehicle(null);

    const markersArray = Array.from(markersRef.current.values());
    if (markersArray.length > 0 && L && mapRef.current) {
      isProgrammaticMoveRef.current = true;
      if (markersArray.length === 1) {
        const latLng = markersArray[0].getLatLng();
        mapRef.current.setView(latLng, 13);
      } else {
        try {
          const group = L.featureGroup(markersArray);
          mapRef.current.fitBounds(group.getBounds(), {
            paddingTopLeft: MAP_PADDING_TOP_LEFT,
            paddingBottomRight: MAP_PADDING_BOTTOM_RIGHT
          });
        } catch (error) {
          const latLng = markersArray[0].getLatLng();
          mapRef.current.setView(latLng, 13);
        }
      }
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 100);
    }
  };

  // Get selected vehicle data
  const selectedVehicle = followingVehicle
    ? vehicles.find(v => v.imei === followingVehicle)
    : null;

  // Calculate time at location from API-provided arrivalTime
  const selectedTimeAtLocation = (() => {
    if (!selectedVehicle?.arrivalTime) return 0;
    const arrivalDate = new Date(selectedVehicle.arrivalTime);
    return currentTime.getTime() - arrivalDate.getTime();
  })();

  // Get idle time for selected vehicle (if idling)
  const selectedIdleTime = followingVehicle
    ? idleTimes.get(followingVehicle) || 0
    : 0;

  // Determine if selected vehicle is idling
  const isSelectedVehicleIdling = selectedVehicle?.isRunning && selectedVehicle?.speed === 0;

  return (
    <div className="h-screen w-screen relative">
      {/* Header Bar - Vehicle Status */}
      <div className="fixed top-0 left-0 right-0 z-[1000] flex items-start">
        {/* Menu Button */}
        <Link
          href="/home"
          className="m-4 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-lg px-4 py-2 flex items-center gap-2 transition-all hover:scale-105 shrink-0"
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

        {/* Vehicle Status Header */}
        {selectedVehicle && (
          <div
            className="flex-1 mr-4 mt-4 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg px-4 py-3 border-l-4"
            style={{ borderLeftColor: selectedVehicle.color }}
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Vehicle Name */}
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-lg"
                  style={{ color: selectedVehicle.color }}
                >
                  {selectedVehicle.name}
                </span>
              </div>

              {/* Status Info */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                {/* Speed */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Speed:</span>
                  <span className="font-semibold">{selectedVehicle.speed} mph</span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-semibold ${
                    isSelectedVehicleIdling ? 'text-yellow-600' :
                    selectedVehicle.isRunning ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isSelectedVehicleIdling
                      ? `● Idling (${formatIdleDuration(selectedIdleTime)})`
                      : selectedVehicle.isRunning ? '● Running' : '● Stopped'}
                  </span>
                </div>

                {/* Fuel */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Fuel:</span>
                  <span className={`font-semibold ${
                    selectedVehicle.fuelLevel > 50 ? 'text-green-600' :
                    selectedVehicle.fuelLevel > 25 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {selectedVehicle.fuelLevel}%
                  </span>
                </div>

                {/* Time at Location - only show when truly parked (engine off) */}
                {!selectedVehicle?.isRunning && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Here:</span>
                    <span className="font-semibold text-blue-600">
                      {selectedVehicle?.arrivalTime
                        ? formatDuration(selectedTimeAtLocation)
                        : "Unknown"}
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Map Container - Full Screen */}
      <div id="map" className="h-full w-full"></div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg z-[1000]">
        <div className="flex justify-around items-center px-4 py-3">
          {VEHICLES.map((vehicle) => {
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

        /* Move zoom controls below header */
        .leaflet-top.leaflet-left {
          top: 100px !important;
        }
      `}</style>
    </div>
  );
}
