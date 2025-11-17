"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";

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

interface JobMapProps {
  jobs: JobLocation[];
}

// Custom component to fit map bounds to show all markers
function MapBounds({ jobs }: { jobs: JobLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (jobs.length > 0) {
      const bounds = L.latLngBounds(
        jobs.map((job) => [job.latitude, job.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [jobs, map]);

  return null;
}

export default function JobMap({ jobs }: JobMapProps) {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  // Create custom icon for job markers
  const createJobIcon = (jobType: string) => {
    // Determine color based on job type
    let color = "#06649b"; // Default Top Shelf blue
    if (jobType.toLowerCase().includes("moving")) {
      color = "#4ECDC4"; // Teal for moving
    } else if (jobType.toLowerCase().includes("junk")) {
      color = "#FF6B6B"; // Red for junk removal
    }

    return L.divIcon({
      className: "custom-job-marker",
      html: `
        <div style="
          background-color: ${color};
          width: 32px;
          height: 32px;
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
            font-size: 16px;
          ">📍</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return timestamp;
    }
  };

  const formatPhone = (phone: string) => {
    // Format phone number if it's a 10-digit string
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Calculate center point for initial map view
  const defaultCenter: [number, number] = jobs.length > 0
    ? [
        jobs.reduce((sum, job) => sum + job.latitude, 0) / jobs.length,
        jobs.reduce((sum, job) => sum + job.longitude, 0) / jobs.length,
      ]
    : [39.8283, -98.5795]; // Geographic center of USA as fallback

  return (
    <div className="w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        className="w-full h-full rounded-lg"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds jobs={jobs} />

        {jobs.map((job) => (
          <Marker
            key={job.id}
            position={[job.latitude, job.longitude]}
            icon={createJobIcon(job.job_type)}
            eventHandlers={{
              click: () => {
                setSelectedJob(job.id);
              },
            }}
          >
            <Popup
              className="custom-job-popup"
              minWidth={selectedJob === job.id ? 320 : 220}
              maxWidth={selectedJob === job.id ? 400 : 250}
            >
              <div className="p-2">
                {/* Always visible info */}
                <div className="space-y-1">
                  <div className="font-bold text-lg" style={{ color: "#06649b" }}>
                    Job #{job.job_number}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {job.job_type}
                  </div>
                  <div className="text-sm text-gray-600">
                    🕐 Start Time: {formatTime(job.job_start_time)}
                  </div>
                </div>

                {/* Expanded details when selected */}
                {selectedJob === job.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    {job.job_description && (
                      <div className="text-sm">
                        <div className="font-semibold text-gray-700">Description:</div>
                        <div className="text-gray-600 mt-1">{job.job_description}</div>
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-semibold text-gray-700">Customer:</div>
                      <div className="text-gray-600 mt-1">{job.customer_name}</div>
                    </div>
                    {job.customer_phone && (
                      <div className="text-sm">
                        <div className="font-semibold text-gray-700">Phone:</div>
                        <a
                          href={`tel:${job.customer_phone}`}
                          className="text-blue-600 hover:underline mt-1 block"
                        >
                          {formatPhone(job.customer_phone)}
                        </a>
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-semibold text-gray-700">Address:</div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline mt-1 block"
                      >
                        {job.address}
                      </a>
                    </div>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Show less
                    </button>
                  </div>
                )}

                {/* Show expand button when not selected */}
                {selectedJob !== job.id && (
                  <button
                    onClick={() => setSelectedJob(job.id)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    View details
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
