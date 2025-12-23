"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ClockIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import type { Employee, TimeEntry, GeoLocation, ClockStatusResponse, Shift } from "../types/scheduling";

// ==================== COMPONENTS ====================

function CurrentTime() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <div className="text-5xl font-bold text-gray-900 tabular-nums">
        {time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </div>
      <div className="text-lg text-gray-500 mt-2">
        {time.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </div>
  );
}

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function PinInput({ value, onChange, error }: PinInputProps) {
  const handleKeyPress = (digit: string) => {
    if (value.length < 6) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="space-y-4">
      {/* PIN display */}
      <div className="flex justify-center space-x-2">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
              i < value.length
                ? "border-[#3D2B1F] bg-[#3D2B1F] text-white"
                : "border-gray-300 bg-white"
            }`}
          >
            {i < value.length ? "•" : ""}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-center text-red-500 text-sm">
          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map(
          (key, i) => (
            <button
              key={i}
              onClick={() => {
                if (key === "←") handleBackspace();
                else if (key) handleKeyPress(key);
              }}
              disabled={!key}
              className={`h-16 rounded-xl text-2xl font-semibold transition-colors ${
                key === "←"
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : key
                  ? "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300"
                  : "invisible"
              }`}
            >
              {key}
            </button>
          )
        )}
      </div>

      {/* Clear button */}
      {value.length > 0 && (
        <button
          onClick={handleClear}
          className="w-full text-gray-500 text-sm hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}

interface PunchButtonProps {
  status: "clock_in" | "clock_out" | "break_start" | "break_end";
  onPress: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

function PunchButton({ status, onPress, isLoading, disabled }: PunchButtonProps) {
  const config = {
    clock_in: {
      label: "CLOCK IN",
      color: "bg-green-500 hover:bg-green-600",
      icon: PlayIcon,
    },
    clock_out: {
      label: "CLOCK OUT",
      color: "bg-red-500 hover:bg-red-600",
      icon: StopIcon,
    },
    break_start: {
      label: "START BREAK",
      color: "bg-yellow-500 hover:bg-yellow-600",
      icon: PauseIcon,
    },
    break_end: {
      label: "END BREAK",
      color: "bg-blue-500 hover:bg-blue-600",
      icon: PlayIcon,
    },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <button
      onClick={onPress}
      disabled={disabled || isLoading}
      className={`w-48 h-48 rounded-full ${color} text-white font-bold text-xl flex flex-col items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none`}
    >
      {isLoading ? (
        <ArrowPathIcon className="w-12 h-12 animate-spin" />
      ) : (
        <>
          <Icon className="w-12 h-12 mb-2" />
          {label}
        </>
      )}
    </button>
  );
}

interface ActivityLogProps {
  entries: {
    time: string;
    action: string;
    details?: string;
  }[];
}

function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No activity today
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div
          key={i}
          className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500" />
          <div className="flex-1">
            <div className="font-medium text-gray-900">{entry.action}</div>
            {entry.details && (
              <div className="text-sm text-gray-500">{entry.details}</div>
            )}
          </div>
          <div className="text-sm text-gray-400">{entry.time}</div>
        </div>
      ))}
    </div>
  );
}

// ==================== MOCK DATA ====================

const mockEmployees: Employee[] = [
  { id: "1", first_name: "Ali", last_name: "Abdullah", email: null, phone: null, hourly_rate: 18.00, role_id: "1", is_manager: false, is_admin: false, is_active: true, pin_code: "1234", profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "2", first_name: "Bennett", last_name: "Gray", email: null, phone: null, hourly_rate: 18.00, role_id: "4", is_manager: false, is_admin: false, is_active: true, pin_code: "5678", profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "5", first_name: "Eric", last_name: "Hinderager", email: null, phone: null, hourly_rate: 25.00, role_id: "2", is_manager: true, is_admin: true, is_active: true, pin_code: "0457", profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
];

// ==================== MAIN PAGE ====================

export default function TimeClockPage() {
  const [step, setStep] = useState<"pin" | "clock">("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [activities, setActivities] = useState<
    { time: string; action: string; details?: string }[]
  >([]);

  // Get location
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationError(null);
      },
      (error) => {
        setLocationError("Unable to get location");
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Get location on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // Handle PIN submission
  useEffect(() => {
    if (pin.length === 6) {
      // Find employee with this PIN
      const found = mockEmployees.find((e) => e.pin_code === pin);

      if (found) {
        setEmployee(found);
        setPinError(null);
        setStep("clock");
        setPin("");
      } else {
        setPinError("Invalid PIN. Please try again.");
        setPin("");
      }
    }
  }, [pin]);

  // Handle punch
  const handlePunch = async (action: "in" | "out") => {
    if (!employee) return;

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (action === "in") {
        setIsClockedIn(true);
        setClockInTime(now);
        setActivities((prev) => [
          { time: timeStr, action: "Clocked In", details: location ? "Location recorded" : undefined },
          ...prev,
        ]);
      } else {
        setIsClockedIn(false);
        setOnBreak(false);
        const duration = clockInTime
          ? Math.round((now.getTime() - clockInTime.getTime()) / 1000 / 60)
          : 0;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        setActivities((prev) => [
          {
            time: timeStr,
            action: "Clocked Out",
            details: `Total: ${hours}h ${mins}m`,
          },
          ...prev,
        ]);
        setClockInTime(null);
      }
    } catch (error) {
      console.error("Punch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle break
  const handleBreak = async (action: "start" | "end") => {
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      if (action === "start") {
        setOnBreak(true);
        setActivities((prev) => [
          { time: timeStr, action: "Break Started" },
          ...prev,
        ]);
      } else {
        setOnBreak(false);
        setActivities((prev) => [
          { time: timeStr, action: "Break Ended" },
          ...prev,
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!clockInTime) return "0h 0m";
    const now = new Date();
    const duration = Math.round((now.getTime() - clockInTime.getTime()) / 1000 / 60);
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    return `${hours}h ${mins}m`;
  };

  // Switch user
  const handleSwitchUser = () => {
    setStep("pin");
    setEmployee(null);
    setIsClockedIn(false);
    setOnBreak(false);
    setClockInTime(null);
    setActivities([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Time Clock</h1>
          {employee && (
            <button
              onClick={handleSwitchUser}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Switch User
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-8 max-w-md mx-auto">
        {step === "pin" ? (
          /* PIN Entry */
          <div className="space-y-8">
            <CurrentTime />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
                Enter Your PIN
              </h2>
              <PinInput value={pin} onChange={setPin} error={pinError || undefined} />
            </div>

            {/* Location status */}
            <div className="flex items-center justify-center text-sm">
              <MapPinIcon
                className={`w-4 h-4 mr-1 ${
                  location ? "text-green-500" : "text-gray-400"
                }`}
              />
              <span className={location ? "text-green-600" : "text-gray-500"}>
                {location
                  ? "Location enabled"
                  : locationError || "Getting location..."}
              </span>
            </div>
          </div>
        ) : (
          /* Clock Interface */
          <div className="space-y-6">
            {/* Employee info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-[#3D2B1F] flex items-center justify-center text-white text-xl font-bold">
                  {employee?.first_name.charAt(0)}
                  {employee?.last_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {employee?.first_name} {employee?.last_name}
                  </h2>
                  <div
                    className={`text-sm font-medium ${
                      isClockedIn
                        ? onBreak
                          ? "text-yellow-600"
                          : "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {isClockedIn
                      ? onBreak
                        ? "On Break"
                        : "Clocked In"
                      : "Clocked Out"}
                  </div>
                </div>
              </div>

              {/* Elapsed time */}
              {isClockedIn && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Time worked today</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {getElapsedTime()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Current time */}
            <CurrentTime />

            {/* Punch button */}
            <div className="flex justify-center">
              {onBreak ? (
                <PunchButton
                  status="break_end"
                  onPress={() => handleBreak("end")}
                  isLoading={isLoading}
                />
              ) : isClockedIn ? (
                <PunchButton
                  status="clock_out"
                  onPress={() => handlePunch("out")}
                  isLoading={isLoading}
                />
              ) : (
                <PunchButton
                  status="clock_in"
                  onPress={() => handlePunch("in")}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Break button */}
            {isClockedIn && !onBreak && (
              <div className="flex justify-center">
                <button
                  onClick={() => handleBreak("start")}
                  disabled={isLoading}
                  className="flex items-center px-6 py-3 bg-yellow-100 text-yellow-700 rounded-xl hover:bg-yellow-200 transition-colors"
                >
                  <PauseIcon className="w-5 h-5 mr-2" />
                  Start Break
                </button>
              </div>
            )}

            {/* Location status */}
            <div className="flex items-center justify-center text-sm">
              <MapPinIcon
                className={`w-4 h-4 mr-1 ${
                  location ? "text-green-500" : "text-gray-400"
                }`}
              />
              <span className={location ? "text-green-600" : "text-gray-500"}>
                {location ? "Location recorded" : locationError || "No location"}
              </span>
            </div>

            {/* Today's activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Today&apos;s Activity
              </h3>
              <ActivityLog entries={activities} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
