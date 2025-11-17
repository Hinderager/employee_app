"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamically import the map component to avoid SSR issues
const JobMap = dynamic(() => import("./JobMap"), { ssr: false });

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
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/job-locations", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job locations");
      }

      const data = await response.json();
      setJobs(data.jobs || []);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchJobs();

    // Auto-refresh every 5 minutes to match n8n sync
    const interval = setInterval(fetchJobs, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link href="/home" className="p-2 -ml-2 active:bg-white/10 rounded-lg">
            <ArrowLeftIcon className="h-6 w-6 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Job Locations</h1>
            <p className="text-sm text-gray-100">
              {loading ? "Loading..." : `${jobs.length} jobs scheduled today`}
            </p>
          </div>
          {lastUpdate && (
            <div className="text-xs text-gray-100">
              Updated: {lastUpdate}
            </div>
          )}
        </div>
      </header>

      <div className="h-[calc(100vh-120px)]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">📍</div>
              <p className="text-gray-600">Loading job locations...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-md">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchJobs}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Jobs Today</h2>
              <p className="text-gray-600">
                There are no scheduled jobs for today.
              </p>
            </div>
          </div>
        ) : (
          <JobMap jobs={jobs} />
        )}
      </div>
    </main>
  );
}
