"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import type { DashboardStats, Alert } from "./types/scheduling";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  href?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, color, href }: MetricCardProps) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}

interface PendingItemProps {
  title: string;
  count: number;
  href: string;
  type: "timesheet" | "time_off" | "swap";
}

function PendingItem({ title, count, href, type }: PendingItemProps) {
  const colors = {
    timesheet: "bg-blue-100 text-blue-700",
    time_off: "bg-yellow-100 text-yellow-700",
    swap: "bg-purple-100 text-purple-700",
  };

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
          {count}
        </span>
        <span className="text-gray-700 font-medium">{title}</span>
      </div>
      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
    </Link>
  );
}

export default function HomebaseDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock data for now - will be replaced with API call
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch('/api/scheduling/dashboard');
        // const data = await response.json();

        // Mock data
        const mockStats: DashboardStats = {
          today: {
            scheduled_employees: 6,
            total_shifts: 8,
            clocked_in: 4,
            labor_cost_projected: 1250.00,
          },
          this_week: {
            total_hours_scheduled: 228,
            total_labor_cost: 4104.00,
            overtime_hours: 12,
            open_shifts: 2,
          },
          pending_approvals: {
            timesheets: 3,
            time_off_requests: 2,
            shift_swaps: 1,
          },
        };

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        setStats(mockStats);
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-xl"></div>
              <div className="h-64 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto text-center py-12">
          <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-gray-500">{error || "Please try again later"}</p>
        </div>
      </div>
    );
  }

  const totalPending =
    stats.pending_approvals.timesheets +
    stats.pending_approvals.time_off_requests +
    stats.pending_approvals.shift_swaps;

  return (
    <div className="p-6 safe-bottom">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Scheduled Today"
            value={stats.today.scheduled_employees}
            subtitle={`${stats.today.total_shifts} shifts`}
            icon={CalendarDaysIcon}
            color="bg-blue-500"
            href="/homebase/schedule"
          />
          <MetricCard
            title="Clocked In"
            value={stats.today.clocked_in}
            subtitle="employees working"
            icon={ClockIcon}
            color="bg-green-500"
            href="/homebase/timesheets"
          />
          <MetricCard
            title="Labor Cost Today"
            value={formatCurrency(stats.today.labor_cost_projected)}
            subtitle="projected"
            icon={CurrencyDollarIcon}
            color="bg-amber-500"
          />
          <MetricCard
            title="Pending Approvals"
            value={totalPending}
            subtitle="need attention"
            icon={ExclamationCircleIcon}
            color={totalPending > 0 ? "bg-red-500" : "bg-gray-400"}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* This Week Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Hours Scheduled</span>
                <span className="font-semibold text-gray-900">{stats.this_week.total_hours_scheduled}h</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Projected Labor Cost</span>
                <span className="font-semibold text-gray-900">{formatCurrency(stats.this_week.total_labor_cost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Overtime Hours</span>
                <span className={`font-semibold ${stats.this_week.overtime_hours > 0 ? "text-amber-600" : "text-gray-900"}`}>
                  {stats.this_week.overtime_hours}h
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Open Shifts</span>
                <span className={`font-semibold ${stats.this_week.open_shifts > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {stats.this_week.open_shifts}
                </span>
              </div>
            </div>
            <Link
              href="/homebase/schedule"
              className="mt-4 flex items-center justify-center w-full py-2.5 px-4 bg-[#3D2B1F] text-white rounded-lg hover:bg-[#4D3B2F] transition-colors"
            >
              View Schedule
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h2>
            {totalPending === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All caught up!</p>
                <p className="text-gray-400 text-sm">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.pending_approvals.timesheets > 0 && (
                  <PendingItem
                    title="Timesheets to approve"
                    count={stats.pending_approvals.timesheets}
                    href="/homebase/timesheets?status=pending"
                    type="timesheet"
                  />
                )}
                {stats.pending_approvals.time_off_requests > 0 && (
                  <PendingItem
                    title="Time off requests"
                    count={stats.pending_approvals.time_off_requests}
                    href="/homebase/time-off?status=pending"
                    type="time_off"
                  />
                )}
                {stats.pending_approvals.shift_swaps > 0 && (
                  <PendingItem
                    title="Shift swap requests"
                    count={stats.pending_approvals.shift_swaps}
                    href="/homebase/schedule?tab=swaps"
                    type="swap"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/homebase/schedule"
            className="flex items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <CalendarDaysIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-700">Edit Schedule</span>
          </Link>
          <Link
            href="/homebase/team"
            className="flex items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <UserGroupIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-700">Manage Team</span>
          </Link>
          <Link
            href="/homebase/clock"
            className="flex items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ClockIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-700">Time Clock</span>
          </Link>
          <Link
            href="/homebase/timesheets"
            className="flex items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <CurrencyDollarIcon className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-700">Run Payroll</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
