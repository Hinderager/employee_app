"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  FunnelIcon,
  Cog6ToothIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type {
  Employee,
  EmployeeWithSchedule,
  Shift,
  Role,
  TimeOffRequest,
  ScheduleDay,
  WeekSummary,
  DaySummary,
  CreateShiftRequest,
} from "../types/scheduling";

// ==================== HELPER FUNCTIONS ====================

function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Start on Monday
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

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDate(date) === formatDate(today);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}${minutes !== "00" ? ":" + minutes : ""}${ampm}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateShiftHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const totalMinutes = endMinutes - startMinutes - breakMinutes;
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// ==================== MOCK DATA ====================

const mockRoles: Role[] = [
  { id: "1", name: "Hauler", color: "#10B981", hourly_rate: 18, sort_order: 1, is_active: true, created_at: "", updated_at: "" },
  { id: "2", name: "Driver", color: "#3B82F6", hourly_rate: 20, sort_order: 2, is_active: true, created_at: "", updated_at: "" },
  { id: "3", name: "Mover", color: "#8B5CF6", hourly_rate: 16, sort_order: 3, is_active: true, created_at: "", updated_at: "" },
  { id: "4", name: "No role", color: "#6B7280", hourly_rate: null, sort_order: 5, is_active: true, created_at: "", updated_at: "" },
];

const mockEmployees: Employee[] = [
  { id: "1", first_name: "Ali", last_name: "Abdullah", email: null, phone: null, hourly_rate: 18.00, role_id: "1", is_manager: false, is_admin: false, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "2", first_name: "Bennett", last_name: "Gray", email: null, phone: null, hourly_rate: 18.00, role_id: "4", is_manager: false, is_admin: false, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "3", first_name: "Chad", last_name: "Heisey", email: null, phone: null, hourly_rate: 20.00, role_id: "1", is_manager: false, is_admin: false, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "4", first_name: "Zac", last_name: "Hembree", email: null, phone: null, hourly_rate: 18.00, role_id: "2", is_manager: false, is_admin: false, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "part_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "5", first_name: "Eric", last_name: "Hinderager", email: null, phone: null, hourly_rate: 25.00, role_id: "2", is_manager: true, is_admin: true, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
  { id: "6", first_name: "Tommy", last_name: "Simonson", email: null, phone: null, hourly_rate: 18.00, role_id: "3", is_manager: false, is_admin: false, is_active: true, pin_code: null, profile_photo_url: null, homebase_id: null, homebase_user_id: null, employment_type: "full_time", hire_date: null, termination_date: null, settings: {}, created_at: "", updated_at: "" },
];

// Generate some mock shifts for the current week
function generateMockShifts(weekDates: Date[]): Shift[] {
  const shifts: Shift[] = [];
  const shiftPatterns = [
    { start: "10:00", end: "19:30", role_id: "1" },
    { start: "10:00", end: "18:00", role_id: "4" },
    { start: "08:00", end: "18:00", role_id: "1" },
    { start: "08:00", end: "16:00", role_id: "2" },
  ];

  // Ali - Mon-Thu shifts
  [0, 1, 2].forEach((dayIdx, i) => {
    shifts.push({
      id: `shift-ali-${dayIdx}`,
      employee_id: "1",
      role_id: "1",
      shift_date: formatDate(weekDates[dayIdx]),
      start_time: "10:00",
      end_time: "19:30",
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
    });
  });

  // Ali - Friday shift
  shifts.push({
    id: `shift-ali-4`,
    employee_id: "1",
    role_id: "1",
    shift_date: formatDate(weekDates[4]),
    start_time: "08:00",
    end_time: "18:00",
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
  });

  // Bennett - Mon-Thu
  [0, 1, 2, 4].forEach((dayIdx) => {
    shifts.push({
      id: `shift-bennett-${dayIdx}`,
      employee_id: "2",
      role_id: "4",
      shift_date: formatDate(weekDates[dayIdx]),
      start_time: dayIdx === 0 ? "10:00" : dayIdx === 1 ? "10:00" : dayIdx === 2 ? "08:00" : "08:00",
      end_time: dayIdx === 0 ? "19:30" : dayIdx === 1 ? "18:00" : dayIdx === 2 ? "18:00" : "18:00",
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
    });
  });

  // Chad - All weekdays
  [0, 1, 2, 3, 4].forEach((dayIdx) => {
    shifts.push({
      id: `shift-chad-${dayIdx}`,
      employee_id: "3",
      role_id: "1",
      shift_date: formatDate(weekDates[dayIdx]),
      start_time: "10:00",
      end_time: "18:00",
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
    });
  });

  return shifts;
}

// Mock time off
function generateMockTimeOff(weekDates: Date[]): TimeOffRequest[] {
  return [
    {
      id: "timeoff-1",
      employee_id: "4", // Zac
      request_type: "personal",
      start_date: formatDate(weekDates[3]), // Thursday
      end_date: formatDate(weekDates[3]),
      is_partial_day: false,
      start_time: null,
      end_time: null,
      total_hours: 8,
      reason: "Personal day",
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      reviewer_notes: null,
      homebase_id: null,
      created_at: "",
      updated_at: "",
    },
  ];
}

// ==================== COMPONENTS ====================

interface ShiftCardProps {
  shift: Shift;
  role?: Role;
  onClick: () => void;
}

function ShiftCard({ shift, role, onClick }: ShiftCardProps) {
  const bgColor = role?.color || "#6B7280";
  const hours = calculateShiftHours(shift.start_time, shift.end_time, shift.break_minutes);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md border-l-4 px-2 py-1.5 text-xs hover:opacity-90 transition-opacity"
      style={{
        borderLeftColor: bgColor,
        backgroundColor: `${bgColor}20`,
      }}
    >
      <div className="font-medium text-gray-900">
        {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
      </div>
      <div className="text-gray-600 truncate">{role?.name || "No role"}</div>
    </button>
  );
}

interface TimeOffCardProps {
  timeOff: TimeOffRequest;
  onClick: () => void;
}

function TimeOffCard({ timeOff, onClick }: TimeOffCardProps) {
  const isPending = timeOff.status === "pending";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md px-2 py-1.5 text-xs border ${
        isPending
          ? "bg-yellow-50 border-yellow-300 border-dashed"
          : "bg-green-50 border-green-300"
      }`}
    >
      <div className="flex items-center text-gray-700">
        <CalendarIcon className="w-3 h-3 mr-1" />
        <span>Time-off</span>
      </div>
      <div className="text-gray-500">
        {timeOff.is_partial_day ? `${timeOff.start_time}-${timeOff.end_time}` : "All Day"}
      </div>
      {isPending && (
        <div className="flex items-center text-yellow-700 mt-0.5">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          <span>Pending approval</span>
        </div>
      )}
    </button>
  );
}

interface EmployeeRowProps {
  employee: Employee;
  weekDates: Date[];
  shifts: Shift[];
  timeOff: TimeOffRequest[];
  roles: Role[];
  onCellClick: (date: Date, employee: Employee) => void;
  onShiftClick: (shift: Shift) => void;
  onTimeOffClick: (timeOff: TimeOffRequest) => void;
}

function EmployeeRow({
  employee,
  weekDates,
  shifts,
  timeOff,
  roles,
  onCellClick,
  onShiftClick,
  onTimeOffClick,
}: EmployeeRowProps) {
  // Calculate weekly totals
  const weeklyHours = shifts.reduce((acc, shift) => {
    return acc + calculateShiftHours(shift.start_time, shift.end_time, shift.break_minutes);
  }, 0);
  const weeklyPay = weeklyHours * employee.hourly_rate;

  return (
    <div className="grid grid-cols-8 border-b border-gray-200 hover:bg-gray-50">
      {/* Employee info cell */}
      <div className="col-span-1 p-3 flex items-center space-x-2 border-r border-gray-200 bg-white sticky left-0 z-10">
        <div className="flex-shrink-0">
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={`${employee.first_name} ${employee.last_name}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
              {getInitials(employee.first_name, employee.last_name)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-gray-900 truncate">
            {employee.first_name} {employee.last_name}
          </div>
          <div className="text-xs text-gray-500">
            <span className={weeklyHours > 0 ? "text-green-600" : ""}>
              {weeklyHours.toFixed(1)} hrs
            </span>
            {" / "}
            <span>${weeklyPay.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Day cells */}
      {weekDates.map((date) => {
        const dateStr = formatDate(date);
        const dayShifts = shifts.filter((s) => s.shift_date === dateStr);
        const dayTimeOff = timeOff.filter(
          (t) => dateStr >= t.start_date && dateStr <= t.end_date
        );

        return (
          <div
            key={dateStr}
            className={`col-span-1 p-1.5 min-h-[80px] border-r border-gray-100 ${
              isToday(date) ? "bg-blue-50" : ""
            }`}
            onClick={() => dayShifts.length === 0 && dayTimeOff.length === 0 && onCellClick(date, employee)}
          >
            <div className="space-y-1">
              {dayShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  role={roles.find((r) => r.id === shift.role_id)}
                  onClick={() => onShiftClick(shift)}
                />
              ))}
              {dayTimeOff.map((to) => (
                <TimeOffCard
                  key={to.id}
                  timeOff={to}
                  onClick={() => onTimeOffClick(to)}
                />
              ))}
              {dayShifts.length === 0 && dayTimeOff.length === 0 && (
                <button
                  onClick={() => onCellClick(date, employee)}
                  className="w-full h-16 rounded-md border-2 border-dashed border-transparent hover:border-gray-300 transition-colors flex items-center justify-center opacity-0 hover:opacity-100"
                >
                  <PlusIcon className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DaySummaryFooterProps {
  weekDates: Date[];
  shifts: Shift[];
  employees: Employee[];
}

function DaySummaryFooter({ weekDates, shifts, employees }: DaySummaryFooterProps) {
  const daySummaries = weekDates.map((date) => {
    const dateStr = formatDate(date);
    const dayShifts = shifts.filter((s) => s.shift_date === dateStr);
    const uniqueEmployees = new Set(dayShifts.map((s) => s.employee_id));
    const totalHours = dayShifts.reduce(
      (acc, s) => acc + calculateShiftHours(s.start_time, s.end_time, s.break_minutes),
      0
    );
    const totalWages = dayShifts.reduce((acc, s) => {
      const emp = employees.find((e) => e.id === s.employee_id);
      const hours = calculateShiftHours(s.start_time, s.end_time, s.break_minutes);
      return acc + hours * (emp?.hourly_rate || 0);
    }, 0);

    return {
      date: dateStr,
      employeeCount: uniqueEmployees.size,
      totalHours,
      laborCost: totalWages,
    };
  });

  // Weekly totals
  const weekTotal = {
    employees: new Set(shifts.map((s) => s.employee_id)).size,
    hours: daySummaries.reduce((acc, d) => acc + d.totalHours, 0),
    wages: daySummaries.reduce((acc, d) => acc + d.laborCost, 0),
  };

  return (
    <div className="grid grid-cols-8 border-t-2 border-gray-300 bg-gray-50">
      {/* Totals label */}
      <div className="col-span-1 p-3 border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
        <div className="text-xs font-medium text-gray-500 uppercase">Totals</div>
        <div className="text-sm font-semibold text-gray-900 mt-1">
          ${weekTotal.wages.toFixed(0)}
        </div>
        <div className="text-xs text-gray-500">{weekTotal.hours.toFixed(1)} hrs</div>
      </div>

      {/* Daily totals */}
      {daySummaries.map((day, idx) => (
        <div
          key={day.date}
          className={`col-span-1 p-2 text-center border-r border-gray-100 ${
            isToday(weekDates[idx]) ? "bg-blue-50" : ""
          }`}
        >
          <div className="flex items-center justify-center text-gray-500 text-xs">
            <UserIcon className="w-3 h-3 mr-1" />
            {day.employeeCount}
          </div>
          <div className="text-sm font-medium text-gray-900 mt-1">
            ${day.laborCost.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">{day.totalHours.toFixed(1)}</div>
        </div>
      ))}
    </div>
  );
}

// ==================== SHIFT MODAL ====================

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift?: Shift;
  employee?: Employee;
  date?: Date;
  roles: Role[];
  onSave: (data: CreateShiftRequest) => void;
  onDelete?: () => void;
}

function ShiftModal({
  isOpen,
  onClose,
  shift,
  employee,
  date,
  roles,
  onSave,
  onDelete,
}: ShiftModalProps) {
  const [startTime, setStartTime] = useState(shift?.start_time || "09:00");
  const [endTime, setEndTime] = useState(shift?.end_time || "17:00");
  const [roleId, setRoleId] = useState(shift?.role_id || roles[0]?.id || "");
  const [breakMinutes, setBreakMinutes] = useState(shift?.break_minutes || 30);
  const [notes, setNotes] = useState(shift?.notes || "");

  useEffect(() => {
    if (shift) {
      setStartTime(shift.start_time);
      setEndTime(shift.end_time);
      setRoleId(shift.role_id || "");
      setBreakMinutes(shift.break_minutes);
      setNotes(shift.notes || "");
    } else {
      setStartTime("09:00");
      setEndTime("17:00");
      setRoleId(roles[0]?.id || "");
      setBreakMinutes(30);
      setNotes("");
    }
  }, [shift, roles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !date) return;

    onSave({
      employee_id: employee.id,
      role_id: roleId,
      shift_date: formatDate(date),
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
      notes: notes || undefined,
    });
    onClose();
  };

  const hours = calculateShiftHours(startTime, endTime, breakMinutes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {shift ? "Edit Shift" : "Add Shift"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Employee */}
          {employee && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                {getInitials(employee.first_name, employee.last_name)}
              </div>
              <div>
                <div className="font-medium">
                  {employee.first_name} {employee.last_name}
                </div>
                <div className="text-sm text-gray-500">
                  {date?.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Hours display */}
          <div className="flex items-center justify-center py-2 bg-gray-50 rounded-lg">
            <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
            <span className="font-medium">{hours.toFixed(1)} hours</span>
            <span className="text-gray-400 ml-1">
              (with {breakMinutes}min break)
            </span>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Break */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Break Duration (minutes)
            </label>
            <select
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0}>No break</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any notes about this shift..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            {shift && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3D2B1F] text-white rounded-lg hover:bg-[#4D3B2F] transition-colors"
            >
              {shift ? "Save Changes" : "Add Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishedCount, setPublishedCount] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Get week dates
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Load data
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    const mockShifts = generateMockShifts(weekDates);
    const mockTimeOff = generateMockTimeOff(weekDates);

    setTimeout(() => {
      setShifts(mockShifts);
      setTimeOff(mockTimeOff);
      setPublishedCount(mockShifts.filter((s) => s.is_published).length);
      setLoading(false);
    }, 300);
  }, [weekDates]);

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

  // Modal handlers
  const handleCellClick = (date: Date, employee: Employee) => {
    setSelectedShift(undefined);
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handleShiftClick = (shift: Shift) => {
    const employee = mockEmployees.find((e) => e.id === shift.employee_id);
    setSelectedShift(shift);
    setSelectedEmployee(employee);
    setSelectedDate(new Date(shift.shift_date));
    setModalOpen(true);
  };

  const handleTimeOffClick = (timeOff: TimeOffRequest) => {
    // TODO: Open time off modal
    console.log("Time off clicked:", timeOff);
  };

  const handleSaveShift = (data: CreateShiftRequest) => {
    if (selectedShift) {
      // Update existing shift
      setShifts(shifts.map((s) =>
        s.id === selectedShift.id
          ? { ...s, ...data, updated_at: new Date().toISOString() }
          : s
      ));
    } else {
      // Create new shift
      const newShift: Shift = {
        id: `shift-new-${Date.now()}`,
        ...data,
        workiz_job_id: null,
        status: "scheduled",
        is_published: false,
        published_at: null,
        published_by: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setShifts([...shifts, newShift]);
    }
  };

  const handleDeleteShift = () => {
    if (selectedShift) {
      setShifts(shifts.filter((s) => s.id !== selectedShift.id));
      setModalOpen(false);
    }
  };

  const unpublishedCount = shifts.filter((s) => !s.is_published).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 lg:top-0">
        <div className="flex items-center justify-between">
          {/* Left: Date navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>

            <div className="flex items-center bg-white border border-gray-300 rounded-lg">
              <button
                onClick={goToPreviousWeek}
                className="p-1.5 hover:bg-gray-50 rounded-l-lg"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700 border-l border-r border-gray-300">
                {formatDateRange(weekDates[0], weekDates[6])}
              </span>
              <button
                onClick={goToNextWeek}
                className="p-1.5 hover:bg-gray-50 rounded-r-lg"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <select className="hidden sm:block px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg">
              <option>Week</option>
              <option>Day</option>
            </select>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            <button className="hidden sm:flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <FunnelIcon className="w-4 h-4 mr-1" />
              Filters
            </button>
            <button className="hidden sm:flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Cog6ToothIcon className="w-4 h-4 mr-1" />
              Tools
            </button>
            <button
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                unpublishedCount > 0
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
              disabled={unpublishedCount === 0}
            >
              <PaperAirplaneIcon className="w-4 h-4 mr-1" />
              Publish ({unpublishedCount})
            </button>
          </div>
        </div>
      </header>

      {/* Schedule Grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3D2B1F]"></div>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-200 bg-white sticky top-0 z-10">
              <div className="col-span-1 p-3 border-r border-gray-200 sticky left-0 bg-white">
                <select className="text-sm text-gray-600 bg-transparent">
                  <option>Custom</option>
                  <option>By Role</option>
                  <option>By Name</option>
                </select>
              </div>
              {weekDates.map((date) => (
                <div
                  key={formatDate(date)}
                  className={`col-span-1 p-3 text-center border-r border-gray-100 ${
                    isToday(date) ? "bg-blue-50" : ""
                  }`}
                >
                  <div
                    className={`text-sm font-medium ${
                      isToday(date) ? "text-blue-600" : "text-gray-900"
                    }`}
                  >
                    {formatDateDisplay(date)}
                  </div>
                </div>
              ))}
            </div>

            {/* Employee rows */}
            <div className="divide-y divide-gray-200">
              {mockEmployees.map((employee) => (
                <EmployeeRow
                  key={employee.id}
                  employee={employee}
                  weekDates={weekDates}
                  shifts={shifts.filter((s) => s.employee_id === employee.id)}
                  timeOff={timeOff.filter((t) => t.employee_id === employee.id)}
                  roles={mockRoles}
                  onCellClick={handleCellClick}
                  onShiftClick={handleShiftClick}
                  onTimeOffClick={handleTimeOffClick}
                />
              ))}
            </div>

            {/* Add employees row */}
            <div className="p-3 border-b border-gray-200">
              <button className="flex items-center text-sm text-green-600 hover:text-green-700">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Employees
              </button>
            </div>

            {/* Footer summary */}
            <DaySummaryFooter
              weekDates={weekDates}
              shifts={shifts}
              employees={mockEmployees}
            />
          </div>
        )}
      </div>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        shift={selectedShift}
        employee={selectedEmployee}
        date={selectedDate}
        roles={mockRoles}
        onSave={handleSaveShift}
        onDelete={selectedShift ? handleDeleteShift : undefined}
      />
    </div>
  );
}
