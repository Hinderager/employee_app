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
}

export default function JobLocationsPage() {
  const mapRef = useRef<any>(null);
  const jobMarkersRef = useRef<any[]>([]);
  const isFirstLoadRef = useRef<boolean>(true);
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapReady, setMapReady] = useState(false);

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

    // Add CartoDB Dark Matter tile layer
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
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
  }, [mapReady]);

  // Fetch job locations only
  const fetchLocations = async () => {
    try {
      // Fetch jobs
      const jobsResponse = await fetch("/api/job-locations");
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
  const updateMapMarkers = (jobData: JobLocation[]) => {
    if (!mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear existing markers
    jobMarkersRef.current.forEach(marker => marker.remove());
    jobMarkersRef.current = [];

    // Sort jobs by start time to determine order
    const sortedJobs = [...jobData].sort((a, b) =>
      new Date(a.job_start_time).getTime() - new Date(b.job_start_time).getTime()
    );

    // Add job markers
    sortedJobs.forEach((job, index) => {
      if (job.latitude && job.longitude) {
        const jobOrder = index + 1;
        const isJunkJob = job.job_type.toLowerCase().includes("junk");
        const jobColor = isJunkJob ? "#FF6B6B" : "#4ECDC4"; // Red for junk, blue for moving
        const startTime = new Date(job.job_start_time).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

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
                top: -40px;
                left: 50%;
                transform: translateX(-50%);
                background: ${jobColor};
                color: white;
                padding: 4px 16px;
                border-radius: 8px;
                font-size: 22px;
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
      }
    });

    // Auto-fit map to show all job markers on first load
    if (jobMarkersRef.current.length > 0 && isFirstLoadRef.current) {
      try {
        const group = L.featureGroup(jobMarkersRef.current);
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (error) {
        console.log('Unable to fit bounds on initial load:', error);
      }
      isFirstLoadRef.current = false;
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

      {/* Map Info - Top Right */}
      <div className="fixed top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm shadow-lg rounded-lg px-4 py-2">
        <div className="text-sm">
          <div className="font-bold text-gray-900">{jobs.length} Jobs Today</div>
          {lastUpdate && (
            <div className="text-xs text-gray-600">
              Updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Map Container - Full Screen */}
      <div id="map" className="h-full w-full"></div>

      <style jsx global>{`
        .custom-job-marker {
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
