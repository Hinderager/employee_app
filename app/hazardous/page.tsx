"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
  quarterly?: boolean;
  hours?: string;
  phone?: string;
}

// Location data without coordinates (will be geocoded in real-time)
interface LocationData {
  name: string;
  address: string;
  hours?: string;
  phone?: string;
}

// Static location data - addresses only, coordinates fetched via API
const APPLIANCES_DATA: LocationData[] = [
  { name: 'Capital Heating & Cooling', address: '420 N Curtis Rd, Boise, ID 83706', hours: 'Mon-Fri 8am-5pm', phone: '(208) 343-8800' },
  { name: 'Garrity Appliance', address: '1207 3rd St S, Nampa, ID 83651', hours: 'Mon-Sat 9am-6pm', phone: '(208) 466-2566' }
];

const METAL_DATA: LocationData[] = [
  { name: 'Pacific Steel & Recycling (Boise)', address: '5120 W Emerald St, Boise, ID 83706', hours: 'Mon-Fri 7:30am-5pm, Sat 8am-12pm', phone: '(208) 344-8552' },
  { name: 'Pacific Steel & Recycling (Nampa)', address: '1900 N 20th St, Nampa, ID 83687', hours: 'Mon-Fri 7:30am-5pm, Sat 8am-12pm', phone: '(208) 466-7841' },
  { name: 'United Metals (Boise)', address: '3809 S Eagleson Rd, Boise, ID 83705', hours: 'Mon-Fri 8am-5pm, Sat 8am-12pm', phone: '(208) 362-3697' },
  { name: 'United Metals (Caldwell)', address: '311 Albany St, Caldwell, ID 83605', hours: 'Mon-Fri 8am-5pm, Sat 8am-12pm', phone: '(208) 454-8800' }
];

const TIRES_DATA: LocationData[] = [
  { name: 'Tire Reclaim', address: '311 Albany St, Caldwell, ID 83605', hours: 'Mon-Fri 7am-4pm', phone: '(208) 454-0097' }
];

const CONCRETE_DATA: LocationData[] = [
  { name: 'Timber Creek (Nampa)', address: '16933 Northside Blvd, Nampa, ID 83687', hours: 'Mon-Fri 7am-5pm' },
  { name: 'Vision Recycling', address: '3824 E Victory Rd, Nampa, ID 83687', hours: 'Mon-Fri 7am-5pm' },
  { name: 'Diamond Street', address: '5800 W Diamond St, Boise, ID 83705', hours: 'Mon-Fri 7am-5pm' },
  { name: 'Suncore', address: '10988 Joplin Rd, Boise, ID 83714', hours: 'Mon-Fri 7am-5pm' },
  { name: 'Timber Creek (Meridian)', address: '7695 S Locust Grove Rd, Meridian, ID 83642', hours: 'Mon-Fri 7am-5pm' }
];

const LANDFILL_DATA: LocationData[] = [
  { name: 'Ada County Landfill', address: '10319 N. Seamans Gulch Rd, Boise, ID 83714', hours: 'Mon-Sat 7am-5pm', phone: '(208) 577-4750' },
  { name: 'Canyon County Landfill', address: '15500 Missouri Ave, Nampa, ID 83686', hours: 'Mon-Sat 7:30am-4:30pm', phone: '(208) 454-7417' }
];

// Get location data for a category (without coordinates)
function getLocationDataForCategory(category: string): LocationData[] {
  switch (category) {
    case "appliances": return APPLIANCES_DATA;
    case "metal": return METAL_DATA;
    case "tires": return TIRES_DATA;
    case "concrete": return CONCRETE_DATA;
    case "landfill": return LANDFILL_DATA;
    default: return [];
  }
}

// Geocode a single address using our API
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (data.success) {
      return { lat: data.lat, lng: data.lng };
    }
    console.error('Geocoding failed for:', address, data.error);
    return null;
  } catch (error) {
    console.error('Geocoding error for:', address, error);
    return null;
  }
}

interface HazardousData {
  success: boolean;
  hasCollectionToday: boolean;
  locations: Location[];
  dayOfWeek: number;
  weekOfMonth: number;
  date: string;
  hours: string;
}

interface WeekLocation {
  location: Location;
  date: Date;
  dayName: string;
  hours: string;
}

interface FourWDStatus {
  status: 'required' | 'recommended' | 'mentioned' | 'none';
  message: string;
}

export default function HazardousDropPage() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [data, setData] = useState<HazardousData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [weekLocations, setWeekLocations] = useState<WeekLocation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("paint");
  const [categoryLocations, setCategoryLocations] = useState<Location[]>([]);
  const [geocodingInProgress, setGeocodingInProgress] = useState(false);
  const [fourWDStatus, setFourWDStatus] = useState<FourWDStatus | null>(null);
  const [fourWDAlertDismissed, setFourWDAlertDismissed] = useState(false);

  // Fetch 4WD status from Ada County Landfill on mount
  useEffect(() => {
    const fetch4WDStatus = async () => {
      try {
        const response = await fetch('/api/landfill-4wd');
        const result = await response.json();
        if (result.success) {
          setFourWDStatus({ status: result.status, message: result.message });
        }
      } catch (err) {
        console.error('Failed to fetch 4WD status:', err);
      }
    };
    fetch4WDStatus();
  }, []);

  // Set date on client side only to avoid hydration mismatch
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(new Date());
    }
  }, [selectedDate]);

  // Geocode locations when category changes (for non-paint categories)
  useEffect(() => {
    if (selectedCategory === "paint") {
      setCategoryLocations([]);
      return;
    }

    const geocodeLocations = async () => {
      setGeocodingInProgress(true);
      const locationData = getLocationDataForCategory(selectedCategory);

      const geocodedLocations: Location[] = [];
      for (const loc of locationData) {
        const coords = await geocodeAddress(loc.address);
        if (coords) {
          geocodedLocations.push({
            name: loc.name,
            address: loc.address,
            lat: coords.lat,
            lng: coords.lng,
            hours: loc.hours,
            phone: loc.phone
          });
        }
      }

      setCategoryLocations(geocodedLocations);
      setGeocodingInProgress(false);
    };

    geocodeLocations();
  }, [selectedCategory]);

  const getDayName = (dayOfWeek: number): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayOfWeek] || "";
  };

  const getFullDayName = (dayOfWeek: number): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek] || "";
  };

  // Format date display (Today, Tomorrow, Yesterday, or date)
  const formatDateDisplay = (date: Date | null): string => {
    if (!date) return "";
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateStr = date.toDateString();
    if (dateStr === today.toDateString()) return "Today";
    if (dateStr === tomorrow.toDateString()) return "Tomorrow";
    if (dateStr === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const goToPreviousDay = () => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    // Skip to previous collection day (Mon-Thu only)
    while (newDate.getDay() === 0 || newDate.getDay() === 5 || newDate.getDay() === 6) {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Skip to next collection day (Mon-Thu only)
    while (newDate.getDay() === 0 || newDate.getDay() === 5 || newDate.getDay() === 6) {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Fetch hazardous collection data for single day
  useEffect(() => {
    if (viewMode !== "day") return;
    if (!selectedDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const response = await fetch(`/api/hazardous?date=${dateStr}`);
        const result = await response.json();
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, viewMode]);

  // Fetch hazardous collection data for rest of week
  useEffect(() => {
    if (viewMode !== "week") return;

    const fetchWeekData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const results: WeekLocation[] = [];

        // Get all Mon-Thu for this week and next that haven't passed
        for (let i = 0; i < 14; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          const dayOfWeek = checkDate.getDay();

          // Only Mon-Thu (1-4)
          if (dayOfWeek >= 1 && dayOfWeek <= 4) {
            const dateStr = checkDate.toISOString().split("T")[0];
            const response = await fetch(`/api/hazardous?date=${dateStr}`);
            const result = await response.json();
            if (result.hasCollectionToday && result.locations) {
              result.locations.forEach((loc: Location) => {
                results.push({
                  location: loc,
                  date: new Date(checkDate),
                  dayName: getDayName(checkDate.getDay()),
                  hours: result.hours
                });
              });
            }
          }
        }

        setWeekLocations(results);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [viewMode]);

  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeaflet = () => {
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
        script.onload = () => setLeafletLoaded(true);
        document.head.appendChild(script);
      } else {
        setLeafletLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  // Clear map when view/category/locations change
  useEffect(() => {
    if (mapRef.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      mapRef.current.remove();
      mapRef.current = null;
      setMapReady(false);
    }
  }, [selectedDate, viewMode, selectedCategory, categoryLocations]);

  // Initialize map when Leaflet is loaded and data is ready
  useEffect(() => {
    if (!leafletLoaded) return;
    if (mapRef.current) return;
    // For paint category, wait for data to load
    if (selectedCategory === "paint" && loading) return;
    // For paint week view, wait for weekLocations to be populated
    if (selectedCategory === "paint" && viewMode === "week" && weekLocations.length === 0) return;
    // For non-paint categories, wait for geocoding to complete
    if (selectedCategory !== "paint" && (geocodingInProgress || categoryLocations.length === 0)) return;

    const L = (window as any).L;
    if (!L) return;

    // Get locations based on selected category
    let allLocations: Location[] = [];
    if (selectedCategory === "paint") {
      if (viewMode === "day" && data?.locations) {
        allLocations = data.locations;
      } else if (viewMode === "week") {
        allLocations = weekLocations.map(wl => wl.location);
      }
    } else {
      // Use geocoded locations for all other categories
      allLocations = categoryLocations;
    }

    // Default center on Boise area if no locations
    const defaultCenter = { lat: 43.615, lng: -116.2023 };
    const centerLocation = allLocations.length > 0 ? allLocations[0] : defaultCenter;
    // Week view: zoom out more to show all locations
    const defaultZoom = viewMode === "week" ? 9 : 10;
    const map = L.map("hazardous-map", {
      center: [centerLocation.lat, centerLocation.lng],
      zoom: defaultZoom,
      zoomControl: true
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "\u00a9 OpenStreetMap contributors \u00a9 CARTO",
        maxZoom: 19
      }
    ).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    const hours = selectedCategory === "paint"
      ? (viewMode === "day" ? data?.hours : "Noon - 7 p.m.")
      : undefined;

    allLocations.forEach((location, index) => {
      // For week view paint, show numbered pins; otherwise show numbered pins for all
      const pinContent = (selectedCategory === "paint" && viewMode === "day")
        ? `<div style="transform: rotate(45deg); font-size: 20px;">☢️</div>`
        : `<div style="transform: rotate(45deg); font-size: 16px; font-weight: bold; color: white;">${index + 1}</div>`;

      const icon = L.divIcon({
        className: "hazardous-marker",
        html: `<div style="position: relative;"><div style="background-color: #f59e0b; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">${pinContent}</div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(map);

      // Use location hours if available, otherwise use paint hours
      const displayHours = location.hours || hours || "See website for hours";
      marker.bindPopup(`<div style="min-width: 200px;"><h3 style="margin: 0 0 8px 0; font-weight: bold; color: #f59e0b;">${location.name}</h3><p style="margin: 4px 0; font-size: 14px;">${location.address}</p><p style="margin: 8px 0 4px 0; font-size: 13px; color: #666;"><strong>Hours:</strong> ${displayHours}</p>${location.phone ? `<p style="margin: 4px 0; font-size: 13px;"><a href="tel:${location.phone}" style="color: #2563eb;">${location.phone}</a></p>` : ''}<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Get Directions</a></div>`, {
        closeOnClick: true,
        closeButton: true
      });

      markersRef.current.push(marker);
    });

    if (allLocations.length > 1) {
      const group = L.featureGroup(markersRef.current);
      // Week view: more padding to zoom out further
      // Category view: use larger padding and maxZoom to show all pins (e.g., Metal spans Boise-Nampa-Caldwell)
      const padding: [number, number] = viewMode === "week" ? [80, 80] : [100, 100];
      map.fitBounds(group.getBounds(), { padding, maxZoom: 11 });
    }
  }, [leafletLoaded, data, weekLocations, loading, viewMode, selectedCategory, categoryLocations, geocodingInProgress]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="shadow-sm safe-top" style={{ backgroundColor: "#f59e0b" }}>
        <div className="px-6 py-4 flex items-center">
          <Link href="/home" className="mr-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-white">Drop Sites</h1>
        </div>
      </header>

      {/* 4WD Alert Banner - shown at top when 4WD is recommended or required */}
      {fourWDStatus && (fourWDStatus.status === 'required' || fourWDStatus.status === 'recommended') && !fourWDAlertDismissed && (
        <div className={`px-4 py-3 ${fourWDStatus.status === 'required' ? 'bg-red-600' : 'bg-orange-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <div>
                <p className="text-white font-bold text-sm">
                  {fourWDStatus.status === 'required' ? '4WD REQUIRED' : '4WD Recommended'}
                </p>
                <p className="text-white/90 text-xs">
                  {fourWDStatus.status === 'required'
                    ? 'Ada County Landfill requires 4-wheel drive today'
                    : 'Ada County Landfill recommends 4-wheel drive today'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFourWDAlertDismissed(true)}
              className="text-white/80 hover:text-white p-1"
              aria-label="Dismiss alert"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Category Tiles - at the top */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setSelectedCategory("paint")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "paint" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none">
              {/* Handle */}
              <path d="M8 4 C8 2 16 2 16 4" stroke="#666" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              {/* Can body */}
              <rect x="5" y="5" width="14" height="16" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5"/>
              {/* Rim */}
              <rect x="4" y="5" width="16" height="2" rx="0.5" fill="#888"/>
              {/* Paint drip on side */}
              <path d="M19 7 L19 12 Q19 14 18 15 L18 13 Q18 11 19 10 Z" fill="#c2410c"/>
              {/* Paint on top */}
              <ellipse cx="12" cy="6" rx="6" ry="1" fill="#c2410c"/>
              {/* Drip from rim */}
              <path d="M7 7 Q6.5 9 7 10 Q7.5 9 7 7" fill="#c2410c"/>
            </svg>
            <p className="text-xs font-medium text-gray-700 mt-1">Paint</p>
          </button>
          <button onClick={() => setSelectedCategory("appliances")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "appliances" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <span className="text-lg">🧊</span>
            <p className="text-xs font-medium text-gray-700 mt-1">Appliances</p>
          </button>
          <button onClick={() => setSelectedCategory("metal")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "metal" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <span className="text-lg">🔩</span>
            <p className="text-xs font-medium text-gray-700 mt-1">Metal</p>
          </button>
          <button onClick={() => setSelectedCategory("tires")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "tires" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none">
              {/* Outer tire */}
              <circle cx="12" cy="12" r="10" fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>
              {/* Inner rim */}
              <circle cx="12" cy="12" r="5" fill="#666"/>
              {/* Hub */}
              <circle cx="12" cy="12" r="2" fill="#888"/>
              {/* Zigzag tread pattern */}
              <path d="M12 2 L14 4 L12 6 L14 8 L12 10" stroke="#444" strokeWidth="1" fill="none"/>
              <path d="M12 22 L14 20 L12 18 L14 16 L12 14" stroke="#444" strokeWidth="1" fill="none"/>
              <path d="M2 12 L4 14 L6 12 L8 14 L10 12" stroke="#444" strokeWidth="1" fill="none"/>
              <path d="M22 12 L20 14 L18 12 L16 14 L14 12" stroke="#444" strokeWidth="1" fill="none"/>
            </svg>
            <p className="text-xs font-medium text-gray-700 mt-1">Tires</p>
          </button>
          <button onClick={() => setSelectedCategory("concrete")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "concrete" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <span className="text-lg">🧱</span>
            <p className="text-xs font-medium text-gray-700 mt-1">Concrete</p>
          </button>
          <button onClick={() => setSelectedCategory("landfill")} className={`rounded-lg p-2 text-center shadow-sm border transition-colors ${selectedCategory === "landfill" ? "bg-amber-100 border-amber-400" : "bg-white border-gray-200 hover:bg-amber-50"}`}>
            <span className="text-lg">🗑️</span>
            <p className="text-xs font-medium text-gray-700 mt-1">Landfill</p>
          </button>
        </div>
      </div>

      {/* Date Navigation - only show for Paint in Day mode */}
      {selectedCategory === "paint" && viewMode === "day" && selectedDate && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="flex flex-col items-center min-w-[140px] hover:bg-gray-50 rounded-lg px-3 py-1 transition-colors"
              suppressHydrationWarning
            >
              <span className="text-lg font-semibold text-gray-900" suppressHydrationWarning>
                {formatDateDisplay(selectedDate)}
              </span>
              <span className="text-xs text-gray-500" suppressHydrationWarning>
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </button>
            <button
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Map Container - always visible */}
      <div id="hazardous-map" className="w-full" style={{ height: "500px" }}></div>

      {/* View Mode Toggle - only for paint category */}
      {selectedCategory === "paint" && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-100">
              <button
                onClick={() => setViewMode("day")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "day"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "week"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content based on selected category */}
      <div className="px-4 py-4 pb-24">
        {selectedCategory === "paint" ? (
          // Paint category - hazardous waste collection
          loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : error ? (
            <div className="text-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : viewMode === "day" && !data?.hasCollectionToday && selectedDate ? (
            <div className="bg-gray-100 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-gray-600">
                No hazardous waste collection on {getFullDayName(selectedDate.getDay())}.
                Collections are Monday through Thursday only.
              </p>
              <a
                href="https://adacounty.id.gov/landfill/waste-types-solutions/hazardous-waste/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-amber-600 hover:text-amber-700 font-medium text-sm"
              >
                View Full Schedule →
              </a>
            </div>
          ) : viewMode === "week" && weekLocations.length === 0 ? (
            <div className="bg-gray-100 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-gray-600">
                No upcoming hazardous waste collections this week.
              </p>
            </div>
          ) : (
            <>
              {/* Collection Times Banner */}
              <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl">☢️</span>
                  <span className="text-amber-800 font-medium">
                    {viewMode === "day" ? `Collection: ${data?.hours}` : `${weekLocations.length} upcoming collection${weekLocations.length > 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>

              {/* Paint Location Cards */}
              {viewMode === "day" ? (
                data?.locations.map((location, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-100 p-3 rounded-xl">
                        <span className="text-2xl">☢️</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{location.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                        <p className="text-amber-700 text-sm font-medium mt-2">Hours: {data.hours}</p>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Get Directions
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                weekLocations.map((item, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center relative">
                        <span className="text-xl font-bold text-white">{index + 1}</span>
                        <span className="absolute -top-1 -right-1 bg-amber-700 text-white text-xs font-bold px-1.5 py-0.5 rounded">{item.dayName}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{item.location.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{item.location.address}</p>
                        <p className="text-amber-700 text-sm font-medium mt-2">{item.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • {item.hours}</p>
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.location.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Get Directions
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )
        ) : geocodingInProgress ? (
          // Loading state while geocoding
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            <span className="ml-3 text-gray-600">Loading locations...</span>
          </div>
        ) : (
          // Other categories - geocoded locations
          <>
            {categoryLocations.map((location, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{location.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                    {location.hours && (
                      <p className="text-amber-700 text-sm font-medium mt-2">Hours: {location.hours}</p>
                    )}
                    {location.phone && (
                      <a href={`tel:${location.phone}`} className="text-blue-600 text-sm mt-1 block">{location.phone}</a>
                    )}
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Get Directions
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-gray-500">Top Shelf Moving and Junk Removal</p>
        </div>
      </footer>

      <style jsx global>{`
        .hazardous-marker {
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
    </main>
  );
}
