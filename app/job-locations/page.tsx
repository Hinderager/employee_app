"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface JobLocation {
  id: string;
  job_number: string;
  job_type: string;
  job_start_time: string;
  job_description: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  latitude: number;
  longitude: number;
  scheduled_date: string;
  // New fields for routes
  has_estimate_form?: boolean;
  service_type?: string | null;
  destination_address?: string | null;
}

interface RouteData {
  jobId: string;
  polyline: any; // Leaflet polyline object
  destinationMarker: any; // Leaflet marker object
}

// Decode Google Maps polyline encoding
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

export default function JobLocationsPage() {
  const mapRef = useRef<any>(null);
  const jobMarkersRef = useRef<any[]>([]);
  const routesRef = useRef<RouteData[]>([]); // Store route polylines and destination markers
  const isFirstLoadRef = useRef<boolean>(true);
  const openPopupJobIdRef = useRef<string | null>(null); // Track which popup is open
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined") return;

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
    if (mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map("map", {
      center: [43.65, -116.42],
      zoom: 13,
      zoomControl: true
    });

    // Add CartoDB Positron tile layer (light theme)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 19
      }
    ).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    // Fetch both vehicles and jobs
    fetchLocations();
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!mapReady) return;

    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [mapReady, selectedDate]);

  // Refetch when date changes
  useEffect(() => {
    if (mapReady) {
      isFirstLoadRef.current = true; // Reset so map re-fits bounds on date change
      fetchLocations();
    }
  }, [selectedDate]);

  // Fetch directions for a job with destination address
  const fetchDirections = async (job: JobLocation): Promise<{polyline: string, destLat: number, destLng: number} | null> => {
    if (!job.destination_address || !job.latitude || !job.longitude) return null;

    try {
      const response = await fetch('/api/job-locations/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat: job.latitude,
          originLng: job.longitude,
          destination: job.destination_address
        })
      });

      if (!response.ok) {
        console.error('Failed to fetch directions for job', job.job_number);
        return null;
      }

      const data = await response.json();
      return {
        polyline: data.polyline,
        destLat: data.destinationLat,
        destLng: data.destinationLng
      };
    } catch (err) {
      console.error('Error fetching directions:', err);
      return null;
    }
  };

  // Fetch job locations only
  const fetchLocations = async () => {
    try {
      // Format date as YYYY-MM-DD
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Fetch jobs
      const jobsResponse = await fetch(`/api/job-locations?date=${dateStr}`);
      const jobsData = await jobsResponse.json();

      setJobs(jobsData.jobs || []);
      setLastUpdate(new Date());
      setLoading(false);
      setError(null);

      // Update map markers
      updateMapMarkers(jobsData.jobs || []);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Update markers on map
  const updateMapMarkers = async (jobData: JobLocation[]) => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Save which popup is currently open (if any)
    let currentOpenJobId: string | null = null;
    jobMarkersRef.current.forEach((marker, index) => {
      if (marker.isPopupOpen && marker.isPopupOpen()) {
        // Find which job this marker belongs to by index
        const sortedJobs = [...jobs].sort((a, b) =>
          new Date(a.job_start_time).getTime() - new Date(b.job_start_time).getTime()
        );
        if (sortedJobs[index]) {
          currentOpenJobId = sortedJobs[index].id;
        }
      }
    });

    // Clear existing markers
    jobMarkersRef.current.forEach(marker => marker.remove());
    jobMarkersRef.current = [];

    // Clear existing routes and destination markers
    routesRef.current.forEach(route => {
      if (route.polyline) route.polyline.remove();
      if (route.destinationMarker) route.destinationMarker.remove();
    });
    routesRef.current = [];

    // Sort jobs by start time to determine order
    const sortedJobs = [...jobData].sort((a, b) =>
      new Date(a.job_start_time).getTime() - new Date(b.job_start_time).getTime()
    );

    // Collect all map elements for bounds calculation
    const allMapElements: any[] = [];

    // Add job markers
    for (let index = 0; index < sortedJobs.length; index++) {
      const job = sortedJobs[index];
      if (job.latitude && job.longitude) {
        const jobOrder = index + 1;
        const isJunkJob = job.job_type.toLowerCase().includes("junk");
        const jobColor = isJunkJob ? "#FF6B6B" : "#4ECDC4"; // Red for junk, teal for moving
        // Parse the time from Workiz
        // JobDateTime comes from Workiz API as ISO 8601 UTC: "2016-08-29T09:12:33.001Z"
        // Convert to MST and display in 12-hour format
        let startTime = '';
        try {
          const dateStr = job.job_start_time;

          // Parse as Date object (handles ISO 8601 format)
          const jobDate = new Date(dateStr);

          // Convert to MST and format as 12-hour time
          startTime = jobDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Denver'
          });
        } catch (e) {
          // Fallback to original string if parsing fails
          console.error('Error parsing job start time:', e);
          startTime = job.job_start_time;
        }

        // Create custom div icon with job order and time
        const jobIcon = L.divIcon({
          className: 'custom-job-marker',
          html: `
            <div style="position: relative;">
              <div style="
                background-color: ${jobColor};
                width: 40px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="
                  transform: rotate(45deg);
                  color: white;
                  font-weight: bold;
                  font-size: 18px;
                ">${jobOrder}</div>
              </div>
              <div style="
                position: absolute;
                top: -35px;
                left: 50%;
                transform: translateX(-50%);
                background: ${jobColor};
                color: white;
                padding: 4px 14px;
                border-radius: 6px;
                font-size: 13pt;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              ">${startTime}</div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40]
        });

        const marker = L.marker([job.latitude, job.longitude], {
          icon: jobIcon
        }).addTo(mapRef.current);

        // Truncate description if too long (approx 3 lines = ~150 chars)
        const descriptionLimit = 150;
        const description = job.job_description || '';
        const needsTruncation = description.length > descriptionLimit;
        const truncatedDesc = needsTruncation ? description.substring(0, descriptionLimit) + '...' : description;
        const popupId = `popup-${job.id}`;

        const popupContent = `
          <div style="min-width: 220px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${jobColor};">
              Job #${jobOrder}: ${job.job_number}
            </h3>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Type:</strong> ${job.job_type}
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Start:</strong> ${startTime}
            </p>
            <p style="margin: 4px 0; font-size: 14px;">
              <strong>Customer:</strong> ${job.customer_name}
            </p>
            ${job.customer_phone ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Phone:</strong> <a href="tel:${job.customer_phone}" style="color: #4ECDC4;">${job.customer_phone}</a>
              </p>
            ` : ''}
            ${job.destination_address ? `
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Destination:</strong> ${job.destination_address}
              </p>
            ` : ''}
            ${description ? `
              <div style="margin: 4px 0;">
                <p id="${popupId}-short" style="margin: 0; font-size: 13px; color: #666; ${needsTruncation ? '' : 'display: none;'}">
                  ${truncatedDesc}
                </p>
                <p id="${popupId}-full" style="margin: 0; font-size: 13px; color: #666; display: ${needsTruncation ? 'none' : 'block'};">
                  ${description}
                </p>
                ${needsTruncation ? `
                  <button
                    id="${popupId}-btn"
                    onclick="
                      const short = document.getElementById('${popupId}-short');
                      const full = document.getElementById('${popupId}-full');
                      const btn = document.getElementById('${popupId}-btn');
                      if (full.style.display === 'none') {
                        short.style.display = 'none';
                        full.style.display = 'block';
                        btn.textContent = 'Show less';
                      } else {
                        short.style.display = 'block';
                        full.style.display = 'none';
                        btn.textContent = 'Show more';
                      }
                    "
                    style="
                      margin-top: 4px;
                      padding: 2px 8px;
                      font-size: 11px;
                      color: #4ECDC4;
                      background: none;
                      border: 1px solid #4ECDC4;
                      border-radius: 4px;
                      cursor: pointer;
                      transition: all 0.2s;
                    "
                    onmouseover="this.style.background='#4ECDC4'; this.style.color='white';"
                    onmouseout="this.style.background='none'; this.style.color='#4ECDC4';"
                  >
                    Show more
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent, {
          closeOnClick: true,
          closeButton: true,
          autoPan: true,
          maxWidth: 300
        });

        jobMarkersRef.current.push(marker);
        allMapElements.push(marker);

        // Reopen popup if this was the previously open one
        if (currentOpenJobId === job.id) {
          marker.openPopup();
        }

        // If this job has a destination address (truck service with estimate form),
        // fetch directions and draw the route
        if (job.destination_address && job.has_estimate_form && job.service_type === 'truck') {
          const directions = await fetchDirections(job);
          if (directions) {
            // Decode the polyline and draw the route
            const decodedPoints = decodePolyline(directions.polyline);

            // Create the route polyline with dashed style
            const routePolyline = L.polyline(decodedPoints, {
              color: '#000000',
              weight: 4,
              opacity: 0.7,
              dashArray: '10, 10' // Dashed line
            }).addTo(mapRef.current);

            // Create black X marker for destination
            const destIcon = L.divIcon({
              className: 'destination-marker',
              html: `
                <div style="
                  width: 30px;
                  height: 30px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 28px;
                  font-weight: bold;
                  color: #000;
                  text-shadow:
                    -1px -1px 0 #fff,
                    1px -1px 0 #fff,
                    -1px 1px 0 #fff,
                    1px 1px 0 #fff,
                    0 0 4px rgba(255,255,255,0.8);
                ">✕</div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });

            const destMarker = L.marker([directions.destLat, directions.destLng], {
              icon: destIcon
            }).addTo(mapRef.current);

            // Add popup to destination marker
            destMarker.bindPopup(`
              <div style="min-width: 180px;">
                <h4 style="margin: 0 0 8px 0; font-weight: bold; color: ${jobColor};">
                  Job #${jobOrder} Destination
                </h4>
                <p style="margin: 4px 0; font-size: 13px;">
                  ${job.destination_address}
                </p>
              </div>
            `, {
              closeOnClick: true,
              closeButton: true
            });

            // Store route data for cleanup
            routesRef.current.push({
              jobId: job.id,
              polyline: routePolyline,
              destinationMarker: destMarker
            });

            allMapElements.push(destMarker);
          }
        }
      }
    }

    // Default bounds: Caldwell west edge to East Boise
    // This ensures a consistent view of the Treasure Valley service area
    const treasureValleyBounds = L.latLngBounds(
      [43.55, -116.72],  // Southwest: south of Caldwell
      [43.72, -116.10]   // Northeast: east Boise near Lucky Peak
    );

    // Auto-fit map on first load or date change
    if (isFirstLoadRef.current) {
      try {
        if (allMapElements.length > 0) {
          // Get bounds of all job markers
          const group = L.featureGroup(allMapElements);
          const jobBounds = group.getBounds();

          // Extend to include Treasure Valley default area
          const combinedBounds = treasureValleyBounds.extend(jobBounds);
          mapRef.current.fitBounds(combinedBounds, { padding: [30, 30] });
        } else {
          // No jobs - show default Treasure Valley view
          mapRef.current.fitBounds(treasureValleyBounds, { padding: [30, 30] });
        }
      } catch (error) {
        console.log('Unable to fit bounds on initial load:', error);
        // Fallback to default view
        mapRef.current.fitBounds(treasureValleyBounds);
      }
      isFirstLoadRef.current = false;
    }
  };

  return (
    <div className="h-screen w-screen relative">
      {/* Back Button - Top Left */}
      <Link
        href="/home"
        className="fixed top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg rounded-full p-2 transition-all hover:scale-105"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Link>

      {/* Date Navigation - Top Center */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm shadow-lg rounded-lg px-3 py-2 ml-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={goToPreviousDay}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="flex flex-col items-center min-w-[140px] hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
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
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend - Bottom Center */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm shadow-lg rounded-lg px-6 py-3">
        <div className="flex items-center gap-6 flex-nowrap whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: '#FF6B6B' }}></div>
            <span className="text-sm font-medium text-gray-900">Junk Removal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex-shrink-0" style={{ backgroundColor: '#4ECDC4' }}></div>
            <span className="text-sm font-medium text-gray-900">Moving</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-black">✕</span>
            <span className="text-sm font-medium text-gray-900">Destination</span>
          </div>
        </div>
      </div>

      {/* Map Container - Full Screen */}
      <div id="map" className="h-full w-full"></div>

      <style jsx global>{`
        .custom-job-marker {
          background: transparent;
          border: none;
        }

        .destination-marker {
          background: transparent;
          border: none;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }

        .leaflet-popup-content {
          margin: 12px;
        }

        .leaflet-top.leaflet-left {
          top: 70px !important;
        }
      `}</style>
    </div>
  );
}
