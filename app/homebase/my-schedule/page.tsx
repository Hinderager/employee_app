"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import type { Shift, Role } from "../types/scheduling";

// ==================== HELPERS ====================

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}${minutes !== "00" ? ":" + minutes : ""}${ampm}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

function calculateHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const totalMinutes = endMinutes - startMinutes - breakMinutes;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// ==================== MOCK DATA ====================

const mockRole: Role = {
  id: "1",
  name: "Hauler",
  color: "#10B981",
  hourly_rate: 18,
  sort_order: 1,
  is_active: true,
  created_at: "",
  updated_at: "",
};

function generateMockShifts(weekDates: Date[]): Shift[] {
  return [
    {
      id: "1",
      employee_id: "current",
      role_id: "1",
      shift_date: formatDate(weekDates[0]),
      start_time: "08:00",
      end_time: "17:00",
      break_minutes: 30,
      workiz_job_id: null,
      status: "scheduled",
      notes: null,
      is_published: true,
      published_at: null,
      published_by: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "2",
      employee_id: "current",
      role_id: "1",
      shift_date: formatDate(weekDates[1]),
      start_time: "09:00",
      end_time: "18:00",
      break_minutes: 30,
      workiz_job_id: "12345",
      status: "scheduled",
      notes: "Moving job - Downtown",
      is_published: true,
      published_at: null,
      published_by: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "3",
      employee_id: "current",
      role_id: "1",
      shift_date: formatDate(weekDates[3]),
      start_time: "07:00",
      end_time: "16:00",
      break_minutes: 30,
      workiz_job_id: null,
      status: "scheduled",
      notes: null,
      is_published: true,
      published_at: null,
      published_by: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    },
    {
      id: "4",
      employee_id: "current",
      role_id: "1",
      shift_date: formatDate(weekDates[4]),
      start_time: "08:00",
      end_time: "17:00",
      break_minutes: 30,
      workiz_job_id: null,
      status: "scheduled",
      notes: null,
      is_published: true,
      published_at: null,
      published_by: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    },
  ];
}

// ==================== COMPONENTS ====================

interface ShiftCardProps {
  shift: Shift;
  role: Role;
  date: Date;
  onSwapRequest: () => void;
}

function ShiftCard({ shift, role, date, onSwapRequest }: ShiftCardProps) {
  const hours = calculateHours(shift.start_time, shift.end_time, shift.break_minutes);
  const pay = hours * (role.hourly_rate || 18);

  const today = isToday(date);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div
      className={`bg-white rounded-xl border-2 overflow-hidden ${
        today ? "border-green-500" : "border-gray-200"
      }`}
    >
      {/* Day header */}
      <div
        className={`px-4 py-2 ${
          today ? "bg-green-500 text-white" : "bg-gray-100 text-gray-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-semibold">{dayName}</span>
            <span className="ml-2 opacity-75">{dateStr}</span>
          </div>
          {today && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
      </div>

      {/* Shift details */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
            </div>
            <div
              className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: role.color }}
            >
              {role.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">{hours.toFixed(1)}h</div>
            <div className="text-sm text-green-600">${pay.toFixed(0)}</div>
          </div>
        </div>

        {/* Notes */}
        {shift.notes && (
          <div className="flex items-start text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
            <MapPinIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
            {shift.notes}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={onSwapRequest}
          className="w-full flex items-center justify-center py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <ArrowsRightLeftIcon className="w-4 h-4 mr-1" />
          Request Swap
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function MySchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const shifts = useMemo(() => generateMockShifts(weekDates), [weekDates]);

  // Calculate weekly totals
  const weeklyHours = shifts.reduce(
    (acc, s) => acc + calculateHours(s.start_time, s.end_time, s.break_minutes),
    0
  );
  const weeklyPay = weeklyHours * 18;

  // Navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format week range
  const weekRangeStr = `${weekDates[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${weekDates[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">My Schedule</h1>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-center">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <span className="px-4 font-medium text-gray-700">{weekRangeStr}</span>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Weekly summary */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-r from-[#3D2B1F] to-[#5D4B3F] rounded-xl p-4 text-white">
          <div className="text-sm opacity-75 mb-1">This Week</div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold">{weeklyHours.toFixed(1)}</span>
              <span className="text-lg ml-1 opacity-75">hours</span>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-75">Expected Pay</div>
              <div className="text-xl font-semibold">${weeklyPay.toFixed(0)}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-sm">
            <span className="opacity-75">{shifts.length} shifts scheduled</span>
            <span className="opacity-75">${(weeklyPay / weeklyHours).toFixed(2)}/hr avg</span>
          </div>
        </div>
      </div>

      {/* Shifts list */}
      <div className="px-4 pb-8 space-y-4">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Upcoming Shifts
        </h2>

        {shifts.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No shifts scheduled this week</p>
          </div>
        ) : (
          shifts.map((shift) => {
            const shiftDate = new Date(shift.shift_date + "T00:00:00");
            return (
              <ShiftCard
                key={shift.id}
                shift={shift}
                role={mockRole}
                date={shiftDate}
                onSwapRequest={() => console.log("Swap request for", shift.id)}
              />
            );
          })
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom lg:ml-56">
        <div className="flex space-x-3">
          <button className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
            Set Availability
          </button>
          <button className="flex-1 py-3 bg-[#3D2B1F] text-white rounded-xl font-medium hover:bg-[#4D3B2F] transition-colors">
            Request Time Off
          </button>
        </div>
      </div>
    </div>
  );
}
