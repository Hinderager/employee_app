"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type { Timesheet, Employee, TimesheetStatus } from "../types/scheduling";

// ==================== HELPERS ====================

function getWeekDates(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ==================== MOCK DATA ====================

interface MockTimesheet {
  id: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number;
  };
  week_start: string;
  week_end: string;
  total_scheduled_hours: number;
  total_worked_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_pay: number;
  status: TimesheetStatus;
  daily_hours: number[];
}

const mockTimesheets: MockTimesheet[] = [
  {
    id: "1",
    employee: { id: "1", first_name: "Ali", last_name: "Abdullah", hourly_rate: 18 },
    week_start: "2025-12-22",
    week_end: "2025-12-28",
    total_scheduled_hours: 40,
    total_worked_hours: 40.5,
    regular_hours: 40,
    overtime_hours: 0.5,
    total_pay: 733.50,
    status: "pending",
    daily_hours: [9.5, 9.5, 10, 0, 10, 1.5, 0],
  },
  {
    id: "2",
    employee: { id: "2", first_name: "Bennett", last_name: "Gray", hourly_rate: 18 },
    week_start: "2025-12-22",
    week_end: "2025-12-28",
    total_scheduled_hours: 36,
    total_worked_hours: 37.5,
    regular_hours: 37.5,
    overtime_hours: 0,
    total_pay: 675,
    status: "submitted",
    daily_hours: [9.5, 8, 10, 0, 10, 0, 0],
  },
  {
    id: "3",
    employee: { id: "3", first_name: "Chad", last_name: "Heisey", hourly_rate: 20 },
    week_start: "2025-12-22",
    week_end: "2025-12-28",
    total_scheduled_hours: 40,
    total_worked_hours: 36,
    regular_hours: 36,
    overtime_hours: 0,
    total_pay: 720,
    status: "approved",
    daily_hours: [8, 8, 8, 0, 8, 4, 0],
  },
];

// ==================== COMPONENTS ====================

interface StatusBadgeProps {
  status: TimesheetStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    pending: { label: "Pending", color: "bg-gray-100 text-gray-700" },
    submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
    approved: { label: "Approved", color: "bg-green-100 text-green-700" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
    paid: { label: "Paid", color: "bg-purple-100 text-purple-700" },
  };

  const { label, color } = config[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

interface TimesheetRowProps {
  timesheet: MockTimesheet;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}

function TimesheetRow({ timesheet, onApprove, onReject, onView }: TimesheetRowProps) {
  const { employee, total_worked_hours, regular_hours, overtime_hours, total_pay, status, daily_hours } = timesheet;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
              {employee.first_name.charAt(0)}
              {employee.last_name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-sm text-gray-500">${employee.hourly_rate}/hr</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Hours summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{total_worked_hours.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{regular_hours.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Regular</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className={`text-lg font-bold ${overtime_hours > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {overtime_hours.toFixed(1)}h
            </div>
            <div className="text-xs text-gray-500">Overtime</div>
          </div>
        </div>

        {/* Daily hours bar */}
        <div className="flex space-x-1 mb-4">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-xs text-gray-400 mb-1">{day}</div>
              <div
                className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                  daily_hours[i] > 0
                    ? daily_hours[i] > 8
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {daily_hours[i] > 0 ? daily_hours[i].toFixed(1) : "-"}
              </div>
            </div>
          ))}
        </div>

        {/* Total pay */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-gray-600">Total Pay</span>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(total_pay)}</span>
        </div>

        {/* Actions */}
        {status === "pending" || status === "submitted" ? (
          <div className="flex space-x-2 pt-3 border-t border-gray-100">
            <button
              onClick={onApprove}
              className="flex-1 flex items-center justify-center py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <CheckCircleIcon className="w-5 h-5 mr-1" />
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              <XCircleIcon className="w-5 h-5 mr-1" />
              Reject
            </button>
          </div>
        ) : (
          <button
            onClick={onView}
            className="w-full py-2 text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function TimesheetsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timesheets, setTimesheets] = useState(mockTimesheets);
  const [filter, setFilter] = useState<"all" | TimesheetStatus>("all");
  const [loading, setLoading] = useState(false);

  const { start: weekStart, end: weekEnd } = getWeekDates(currentDate);

  // Calculate totals
  const filteredTimesheets = filter === "all"
    ? timesheets
    : timesheets.filter((t) => t.status === filter);

  const totals = {
    employees: filteredTimesheets.length,
    hours: filteredTimesheets.reduce((acc, t) => acc + t.total_worked_hours, 0),
    pay: filteredTimesheets.reduce((acc, t) => acc + t.total_pay, 0),
    pending: timesheets.filter((t) => t.status === "pending" || t.status === "submitted").length,
  };

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

  // Actions
  const handleApprove = (id: string) => {
    setTimesheets(
      timesheets.map((t) =>
        t.id === id ? { ...t, status: "approved" as TimesheetStatus } : t
      )
    );
  };

  const handleReject = (id: string) => {
    setTimesheets(
      timesheets.map((t) =>
        t.id === id ? { ...t, status: "rejected" as TimesheetStatus } : t
      )
    );
  };

  const handleApproveAll = () => {
    setTimesheets(
      timesheets.map((t) =>
        t.status === "pending" || t.status === "submitted"
          ? { ...t, status: "approved" as TimesheetStatus }
          : t
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Timesheets</h1>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-white border border-gray-300 rounded-lg">
            <button
              onClick={goToPreviousWeek}
              className="p-1.5 hover:bg-gray-50 rounded-l-lg"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700 border-l border-r border-gray-300">
              {formatDateRange(weekStart, weekEnd)}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-1.5 hover:bg-gray-50 rounded-r-lg"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {totals.pending > 0 && (
            <button
              onClick={handleApproveAll}
              className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Approve All ({totals.pending})
            </button>
          )}
        </div>
      </header>

      {/* Summary cards */}
      <div className="px-4 py-4 grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <UserIcon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{totals.employees}</div>
          <div className="text-xs text-gray-500">Employees</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <ClockIcon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{totals.hours.toFixed(1)}h</div>
          <div className="text-xs text-gray-500">Total Hours</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-lg font-bold text-gray-900">{formatCurrency(totals.pay)}</div>
          <div className="text-xs text-gray-500">Total Pay</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mb-4">
        <div className="flex space-x-2 overflow-x-auto">
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? "bg-[#3D2B1F] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timesheets list */}
      <div className="px-4 pb-8 space-y-4">
        {filteredTimesheets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No timesheets found
          </div>
        ) : (
          filteredTimesheets.map((timesheet) => (
            <TimesheetRow
              key={timesheet.id}
              timesheet={timesheet}
              onApprove={() => handleApprove(timesheet.id)}
              onReject={() => handleReject(timesheet.id)}
              onView={() => console.log("View", timesheet.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
