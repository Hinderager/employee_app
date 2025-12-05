"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
  quarterly?: boolean;
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

export default function HazardousDropPage() {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [data, setData] = useState<HazardousData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"today" | "week">("today");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week
  const [weekData, setWeekData] = useState<Array<{ date: Date; data: HazardousData }>>([]);

  // Format date display (Today, Tomorrow, Yesterday, or date)
  const formatDateDisplay = (date: Date): string => {
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
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    // Skip to previous collection day (Mon-Thu only)
    while (newDate.getDay() === 0 || newDate.getDay() === 5 || newDate.getDay() === 6) {
      newDate.setDate(newDate.getDate() - 1);
    }
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
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
    if (viewMode !== "today") return;

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

  // Fetch hazardous collection data for week
  useEffect(() => {
    if (viewMode !== "week") return;

    const fetchWeekData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        const results: Array<{ date: Date; data: HazardousData }> = [];

        // Calculate start of the week to check
        const startOffset = weekOffset === 0 ? 0 : 7;

        // Get all Mon-Thu for the selected week
        for (let i = startOffset; i < startOffset + 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          const dayOfWeek = checkDate.getDay();

          // Only Mon-Thu (1-4), and skip past days for this week
          if (dayOfWeek >= 1 && dayOfWeek <= 4) {
            // For this week, skip days that have passed
            if (weekOffset === 0 && checkDate < today) continue;

            const dateStr = checkDate.toISOString().split("T")[0];
            const response = await fetch(`/api/hazardous?date=${dateStr}`);
            const result = await response.json();
            if (result.hasCollectionToday) {
              results.push({ date: new Date(checkDate), data: result });
            }
          }
        }

        setWeekData(results);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setLoading(false);
      }
    };

    fetchWeekData();
  }, [viewMode, weekOffset]);

  // Clear map when view changes
  useEffect(() => {
    if (mapRef.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      mapRef.current.remove();
      mapRef.current = null;
      setMapReady(false);
    }
  }, [selectedDate, viewMode, weekOffset]);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || loading) return;

    // For today view, need data with collection
    if (viewMode === "today" && !data?.hasCollectionToday) return;

    // For week view, need at least one location
    if (viewMode === "week" && weekData.length === 0) return;

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
  }, [data, weekData, loading, viewMode]);

  const initMap = () => {
    if (mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Get locations based on view mode
    let allLocations: Location[] = [];
    if (viewMode === "today" && data?.locations) {
      allLocations = data.locations;
    } else if (viewMode === "week") {
      weekData.forEach(item => {
        allLocations.push(...item.data.locations);
      });
    }

    if (allLocations.length === 0) return;

    const firstLocation = allLocations[0];
    const map = L.map("hazardous-map", {
      center: [firstLocation.lat, firstLocation.lng],
      zoom: 10,
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

    const hours = viewMode === "today" ? data?.hours : "Noon - 7 p.m.";

    allLocations.forEach((location) => {
      const icon = L.divIcon({
        className: "hazardous-marker",
        html: `<div style="position: relative;"><div style="background-color: #f59e0b; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="transform: rotate(45deg); font-size: 20px;">\u2622\ufe0f</div></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40]
      });

      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(map);

      marker.bindPopup(`<div style="min-width: 200px;"><h3 style="margin: 0 0 8px 0; font-weight: bold; color: #f59e0b;">${location.name}</h3><p style="margin: 4px 0; font-size: 14px;">${location.address}</p><p style="margin: 8px 0 4px 0; font-size: 13px; color: #666;"><strong>Hours:</strong> ${hours}</p><a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Get Directions</a></div>`, {
        closeOnClick: true,
        closeButton: true
      });

      markersRef.current.push(marker);
    });

    if (allLocations.length > 1) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek] || "";
  };

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
          <h1 className="text-lg font-bold text-white">Hazardous Drop</h1>
        </div>
      </header>

      {/* Date Navigation - changes based on view mode */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        {viewMode === "today" ? (
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
            >
              <span className="text-lg font-semibold text-gray-900">
                {formatDateDisplay(selectedDate)}
              </span>
              <span className="text-xs text-gray-500">
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
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              className={`p-2 rounded-full transition-colors ${weekOffset === 0 ? "text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col items-center min-w-[140px] px-3 py-1">
              <span className="text-lg font-semibold text-gray-900">
                {weekOffset === 0 ? "This Week" : "Next Week"}
              </span>
              <span className="text-xs text-gray-500">
                Mon - Thu
              </span>
            </div>
            <button
              onClick={() => setWeekOffset(1)}
              disabled={weekOffset === 1}
              className={`p-2 rounded-full transition-colors ${weekOffset === 1 ? "text-gray-300" : "hover:bg-gray-100 text-gray-600"}`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-100">
            <button
              onClick={() => setViewMode("today")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "today"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Rest of Week
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      ) : error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : viewMode === "today" && !data?.hasCollectionToday ? (
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Collection</h2>
              <p className="text-gray-600">
                No hazardous waste collection on {getDayName(selectedDate.getDay())}.
                Collections are Monday through Thursday only.
              </p>
              <a
                href="https://adacounty.id.gov/landfill/waste-types-solutions/hazardous-waste/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-amber-600 hover:text-amber-700 font-medium"
              >
                View Full Schedule →
              </a>
            </div>
          </div>
        </div>
      ) : viewMode === "week" && weekData.length === 0 ? (
        <div className="px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Collections</h2>
              <p className="text-gray-600">
                No hazardous waste collections {weekOffset === 0 ? "remaining this week" : "next week"}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Alert Banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">☢️</span>
              <span className="text-amber-800 font-medium">
                {viewMode === "today" ? `Collection: ${data?.hours}` : `${weekData.length} collection${weekData.length > 1 ? "s" : ""} ${weekOffset === 0 ? "this week" : "next week"}`}
              </span>
            </div>
          </div>

          {/* Map Container */}
          <div id="hazardous-map" className="w-full" style={{ height: "500px" }}></div>

          {/* Location Cards */}
          <div className="px-4 py-4 pb-24">
            {viewMode === "today" ? (
              data?.locations.map((location, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-md p-4 mb-4 border border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 p-3 rounded-xl">
                      <span className="text-2xl">☢️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{location.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                      <p className="text-amber-700 text-sm font-medium mt-2">
                        Hours: {data.hours}
                      </p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Get Directions
                      </a>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              weekData.map((dayItem, dayIndex) => (
                <div key={dayIndex} className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {dayItem.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                  </h3>
                  {dayItem.data.locations.map((location, locIndex) => (
                    <div
                      key={locIndex}
                      className="bg-white rounded-2xl shadow-md p-4 mb-3 border border-gray-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-amber-100 p-3 rounded-xl">
                          <span className="text-2xl">☢️</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{location.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">{location.address}</p>
                          <p className="text-amber-700 text-sm font-medium mt-2">
                            Hours: {dayItem.data.hours}
                          </p>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Get Directions
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}

            {/* Info Card */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Accepted Items</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Paints, stains, solvents</li>
                <li>• Pesticides, herbicides</li>
                <li>• Automotive fluids (oil, antifreeze)</li>
                <li>• Household cleaners, pool chemicals</li>
                <li>• Batteries, fluorescent bulbs</li>
              </ul>
              <a
                href="https://adacounty.id.gov/landfill/waste-types-solutions/hazardous-waste/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium text-sm"
              >
                View Full List →
              </a>
            </div>
          </div>
        </>
      )}

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
