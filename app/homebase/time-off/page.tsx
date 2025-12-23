"use client";

import { useState } from "react";
import {
  PlusIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import type { TimeOffRequest, TimeOffType, TimeOffStatus } from "../types/scheduling";

// ==================== MOCK DATA ====================

const mockRequests: (TimeOffRequest & { employee_name: string })[] = [
  {
    id: "1",
    employee_id: "4",
    employee_name: "Zac Hembree",
    request_type: "personal",
    start_date: "2025-12-26",
    end_date: "2025-12-26",
    is_partial_day: false,
    start_time: null,
    end_time: null,
    total_hours: 8,
    reason: "Family event",
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    homebase_id: null,
    created_at: "2025-12-20",
    updated_at: "2025-12-20",
  },
  {
    id: "2",
    employee_id: "2",
    employee_name: "Bennett Gray",
    request_type: "vacation",
    start_date: "2025-12-30",
    end_date: "2025-12-31",
    is_partial_day: false,
    start_time: null,
    end_time: null,
    total_hours: 16,
    reason: "New Year's vacation",
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    reviewer_notes: null,
    homebase_id: null,
    created_at: "2025-12-18",
    updated_at: "2025-12-18",
  },
  {
    id: "3",
    employee_id: "1",
    employee_name: "Ali Abdullah",
    request_type: "sick",
    start_date: "2025-12-15",
    end_date: "2025-12-15",
    is_partial_day: false,
    start_time: null,
    end_time: null,
    total_hours: 8,
    reason: "Not feeling well",
    status: "approved",
    reviewed_by: "5",
    reviewed_at: "2025-12-15",
    reviewer_notes: null,
    homebase_id: null,
    created_at: "2025-12-15",
    updated_at: "2025-12-15",
  },
];

// ==================== COMPONENTS ====================

function StatusBadge({ status }: { status: TimeOffStatus }) {
  const config = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700" },
    approved: { label: "Approved", color: "bg-green-100 text-green-700" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
    cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700" },
  };
  const { label, color } = config[status];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: TimeOffType }) {
  const config: Record<TimeOffType, { label: string; icon: typeof SunIcon }> = {
    vacation: { label: "Vacation", icon: SunIcon },
    sick: { label: "Sick", icon: ClockIcon },
    personal: { label: "Personal", icon: CalendarDaysIcon },
    bereavement: { label: "Bereavement", icon: CalendarDaysIcon },
    jury_duty: { label: "Jury Duty", icon: CalendarDaysIcon },
    unpaid: { label: "Unpaid", icon: CalendarDaysIcon },
    other: { label: "Other", icon: CalendarDaysIcon },
  };
  const { label, icon: Icon } = config[type];
  return (
    <span className="flex items-center text-sm text-gray-600">
      <Icon className="w-4 h-4 mr-1" />
      {label}
    </span>
  );
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  if (start === end) {
    return startDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  return `${startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} - ${endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

// ==================== MAIN PAGE ====================

export default function TimeOffPage() {
  const [requests, setRequests] = useState(mockRequests);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const filteredRequests = filter === "all"
    ? requests
    : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const handleApprove = (id: string) => {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "approved" as TimeOffStatus } : r
      )
    );
  };

  const handleReject = (id: string) => {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "rejected" as TimeOffStatus } : r
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 safe-bottom">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Time Off</h1>
          <button className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-[#3D2B1F] rounded-lg hover:bg-[#4D3B2F]">
            <PlusIcon className="w-4 h-4 mr-1" />
            Request
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-2">
          {[
            { value: "all", label: "All" },
            { value: "pending", label: `Pending (${pendingCount})` },
            { value: "approved", label: "Approved" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.value
                  ? "bg-[#3D2B1F] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Requests list */}
      <div className="px-4 py-4 space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No time off requests
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {request.employee_name}
                  </h3>
                  <TypeBadge type={request.request_type} />
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="flex items-center text-sm text-gray-600 mb-2">
                <CalendarDaysIcon className="w-4 h-4 mr-2 text-gray-400" />
                {formatDateRange(request.start_date, request.end_date)}
                {request.total_hours && (
                  <span className="ml-2 text-gray-400">
                    ({request.total_hours}h)
                  </span>
                )}
              </div>

              {request.reason && (
                <p className="text-sm text-gray-500 mb-3">{request.reason}</p>
              )}

              {request.status === "pending" && (
                <div className="flex space-x-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="flex-1 flex items-center justify-center py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircleIcon className="w-5 h-5 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="flex-1 flex items-center justify-center py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <XCircleIcon className="w-5 h-5 mr-1" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
