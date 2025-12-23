// =============================================================================
// EMPLOYEE SCHEDULING & TIMESHEET TYPES
// =============================================================================

// ==================== ROLES ====================
export interface Role {
  id: string;
  name: string;
  color: string;
  hourly_rate: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== EMPLOYEES ====================
export interface Employee {
  id: string;
  homebase_id: number | null;
  homebase_user_id: number | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  profile_photo_url: string | null;
  role_id: string | null;
  role?: Role;
  hourly_rate: number;
  employment_type: 'full_time' | 'part_time' | 'contractor';
  hire_date: string | null;
  termination_date: string | null;
  is_manager: boolean;
  is_admin: boolean;
  is_active: boolean;
  pin_code: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithSchedule extends Employee {
  shifts: Shift[];
  time_off: TimeOffRequest[];
  availability: Availability[];
  weekly_hours: number;
  weekly_pay: number;
}

export interface CreateEmployeeRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role_id?: string;
  hourly_rate?: number;
  employment_type?: 'full_time' | 'part_time' | 'contractor';
  is_manager?: boolean;
  pin_code?: string;
}

export interface UpdateEmployeeRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role_id?: string;
  hourly_rate?: number;
  employment_type?: 'full_time' | 'part_time' | 'contractor';
  is_manager?: boolean;
  is_admin?: boolean;
  is_active?: boolean;
  pin_code?: string;
  profile_photo_url?: string;
}

// ==================== SHIFTS ====================
export interface Shift {
  id: string;
  employee_id: string;
  employee?: Employee;
  role_id: string | null;
  role?: Role;
  shift_date: string;  // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  break_minutes: number;
  workiz_job_id: string | null;
  status: ShiftStatus;
  notes: string | null;
  is_published: boolean;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ShiftStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface CreateShiftRequest {
  employee_id: string;
  role_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  workiz_job_id?: string;
  notes?: string;
}

export interface UpdateShiftRequest {
  employee_id?: string;
  role_id?: string;
  shift_date?: string;
  start_time?: string;
  end_time?: string;
  break_minutes?: number;
  workiz_job_id?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface CopyShiftsRequest {
  source_date: string;     // YYYY-MM-DD
  target_date: string;     // YYYY-MM-DD
  copy_type: 'day' | 'week';
  employee_ids?: string[];
}

export interface PublishScheduleRequest {
  start_date: string;
  end_date: string;
  publish: boolean;
}

// ==================== TIME CLOCK ====================
export interface TimeEntry {
  id: string;
  employee_id: string;
  employee?: Employee;
  shift_id: string | null;
  shift?: Shift;
  clock_in: string;
  clock_out: string | null;
  clock_in_location: GeoLocation | null;
  clock_out_location: GeoLocation | null;
  total_hours: number | null;
  break_minutes: number;
  status: TimeEntryStatus;
  edited_by: string | null;
  edit_reason: string | null;
  original_clock_in: string | null;
  original_clock_out: string | null;
  device_info: Record<string, unknown>;
  breaks?: Break[];
  created_at: string;
  updated_at: string;
}

export type TimeEntryStatus = 'active' | 'on_break' | 'completed' | 'edited';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
}

export interface PunchRequest {
  employee_id: string;
  pin_code: string;
  action: 'in' | 'out';
  location?: GeoLocation;
  shift_id?: string;
}

export interface PunchResponse {
  success: boolean;
  time_entry: TimeEntry;
  message: string;
}

export interface ClockStatusResponse {
  is_clocked_in: boolean;
  current_entry: TimeEntry | null;
  on_break: boolean;
  current_break: Break | null;
  today_total_hours: number;
  week_total_hours: number;
  scheduled_shift: Shift | null;
}

export interface ManualTimeEntryRequest {
  employee_id: string;
  clock_in: string;
  clock_out: string;
  shift_id?: string;
  edit_reason: string;
  edited_by: string;
}

// ==================== BREAKS ====================
export interface Break {
  id: string;
  time_entry_id: string;
  break_start: string;
  break_end: string | null;
  break_type: 'paid' | 'unpaid';
  minutes: number | null;
  created_at: string;
}

export interface BreakRequest {
  time_entry_id: string;
  action: 'start' | 'end';
  break_type?: 'paid' | 'unpaid';
}

// ==================== TIMESHEETS ====================
export interface Timesheet {
  id: string;
  employee_id: string;
  employee?: Employee;
  week_start: string;   // YYYY-MM-DD (Monday)
  week_end: string;     // YYYY-MM-DD (Sunday)
  total_scheduled_hours: number;
  total_worked_hours: number;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number | null;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
  status: TimesheetStatus;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  employee_notes: string | null;
  manager_notes: string | null;
  time_entries?: TimeEntry[];
  created_at: string;
  updated_at: string;
}

export type TimesheetStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface TimesheetCalculation {
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  total_pay: number;
  daily_breakdown: DayBreakdown[];
}

export interface DayBreakdown {
  date: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  entries: TimeEntry[];
}

export interface ApproveTimesheetRequest {
  timesheet_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
  manager_notes?: string;
}

export interface ExportTimesheetsRequest {
  start_date: string;
  end_date: string;
  employee_ids?: string[];
  format: 'csv' | 'json';
  status?: TimesheetStatus;
}

// ==================== TIME OFF ====================
export interface TimeOffRequest {
  id: string;
  employee_id: string;
  employee?: Employee;
  request_type: TimeOffType;
  start_date: string;
  end_date: string;
  is_partial_day: boolean;
  start_time: string | null;
  end_time: string | null;
  total_hours: number | null;
  reason: string | null;
  status: TimeOffStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  homebase_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'bereavement' | 'jury_duty' | 'unpaid' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface CreateTimeOffRequest {
  employee_id: string;
  request_type: TimeOffType;
  start_date: string;
  end_date: string;
  is_partial_day?: boolean;
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  reason?: string;
}

export interface ApproveTimeOffRequest {
  request_id: string;
  action: 'approve' | 'reject';
  reviewer_notes?: string;
}

// ==================== SHIFT SWAPS ====================
export interface ShiftSwap {
  id: string;
  requester_id: string;
  requester?: Employee;
  original_shift_id: string;
  original_shift?: Shift;
  target_employee_id: string | null;
  target_employee?: Employee;
  target_shift_id: string | null;
  target_shift?: Shift;
  swap_type: SwapType;
  reason: string | null;
  status: SwapStatus;
  target_responded_at: string | null;
  target_accepted: boolean | null;
  target_notes: string | null;
  requires_manager_approval: boolean;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  manager_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SwapType = 'giveaway' | 'swap' | 'pickup';
export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'manager_pending' | 'approved' | 'rejected' | 'cancelled';

export interface CreateShiftSwapRequest {
  original_shift_id: string;
  target_employee_id?: string;
  target_shift_id?: string;
  swap_type: SwapType;
  reason?: string;
}

export interface RespondToSwapRequest {
  swap_id: string;
  action: 'accept' | 'decline';
  target_shift_id?: string;
  notes?: string;
}

export interface ApproveSwapRequest {
  swap_id: string;
  action: 'approve' | 'reject';
  notes?: string;
}

// ==================== AVAILABILITY ====================
export interface Availability {
  id: string;
  employee_id: string;
  day_of_week: number;  // 0 = Sunday, 6 = Saturday
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetAvailabilityRequest {
  employee_id: string;
  availability: WeeklyAvailability[];
  effective_from?: string;
  effective_until?: string;
}

export interface WeeklyAvailability {
  day_of_week: number;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
}

export interface TeamAvailabilityResponse {
  date: string;
  employees: {
    employee: Employee;
    is_available: boolean;
    availability_window: { start: string; end: string } | null;
    has_shift: boolean;
    has_time_off: boolean;
  }[];
}

// ==================== DASHBOARD ====================
export interface DashboardStats {
  today: {
    scheduled_employees: number;
    total_shifts: number;
    clocked_in: number;
    labor_cost_projected: number;
  };
  this_week: {
    total_hours_scheduled: number;
    total_labor_cost: number;
    overtime_hours: number;
    open_shifts: number;
  };
  pending_approvals: {
    timesheets: number;
    time_off_requests: number;
    shift_swaps: number;
  };
}

export interface Alert {
  id: string;
  type: AlertType;
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  related_id: string;
  employee_id?: string;
  created_at: string;
}

export type AlertType =
  | 'timesheet_pending'
  | 'time_off_pending'
  | 'swap_pending'
  | 'overtime_warning'
  | 'unfilled_shift'
  | 'late_clock_in'
  | 'missed_punch';

// ==================== SCHEDULE VIEW ====================
export interface ScheduleDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isToday: boolean;
  shifts: Shift[];
  timeOff: TimeOffRequest[];
  workizJobs: WorkizJobForSchedule[];
}

export interface ScheduleWeek {
  weekStart: string;
  weekEnd: string;
  days: ScheduleDay[];
  employees: EmployeeWithSchedule[];
  summary: WeekSummary;
}

export interface WeekSummary {
  totalHours: number;
  totalLaborCost: number;
  employeeCount: number;
  shiftCount: number;
  dailySummaries: DaySummary[];
}

export interface DaySummary {
  date: string;
  employeeCount: number;
  totalHours: number;
  laborCost: number;
}

// ==================== WORKIZ INTEGRATION ====================
export interface WorkizJobForSchedule {
  id: string;
  serial_id: string;
  job_type: string;
  job_date_time: string;
  job_end_date_time: string | null;
  customer_name: string;
  address: string;
  city: string;
  status: string;
  team: { id: string; name: string }[];
}

// ==================== SCHEDULE FILTERS ====================
export interface ScheduleFilters {
  roles: string[];
  employees: string[];
  showTimeOff: boolean;
  showUnavailability: boolean;
  showWorkizJobs: boolean;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}
