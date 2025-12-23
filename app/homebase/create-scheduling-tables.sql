-- =============================================================================
-- EMPLOYEE SCHEDULING & TIMESHEET DATABASE SCHEMA
-- For Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. ROLES TABLE (for color-coded shift display)
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6',  -- Hex color for UI
  hourly_rate DECIMAL(10,2),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO homebase_roles (name, color, sort_order) VALUES
  ('Hauler', '#10B981', 1),    -- Green
  ('Driver', '#3B82F6', 2),    -- Blue
  ('Mover', '#8B5CF6', 3),     -- Purple
  ('Manager', '#F59E0B', 4),   -- Amber
  ('No role', '#6B7280', 5)    -- Gray
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. EMPLOYEES TABLE (sync from Homebase)
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Homebase integration
  homebase_id INTEGER UNIQUE,
  homebase_user_id INTEGER,

  -- Basic info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  profile_photo_url TEXT,

  -- Employment
  role_id UUID REFERENCES homebase_roles(id) ON DELETE SET NULL,
  hourly_rate DECIMAL(10,2) DEFAULT 18.00,
  employment_type VARCHAR(20) DEFAULT 'full_time',  -- full_time, part_time, contractor
  hire_date DATE,
  termination_date DATE,

  -- Access
  is_manager BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  pin_code VARCHAR(6),  -- For time clock

  -- Metadata
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_emp_homebase ON homebase_employees(homebase_id) WHERE homebase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sched_emp_active ON homebase_employees(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sched_emp_name ON homebase_employees(last_name, first_name);

-- =============================================================================
-- 3. SHIFTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Assignment
  employee_id UUID REFERENCES homebase_employees(id) ON DELETE CASCADE,
  role_id UUID REFERENCES homebase_roles(id) ON DELETE SET NULL,

  -- Timing
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,

  -- Workiz job reference (for display)
  workiz_job_id TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, confirmed, in_progress, completed, cancelled, no_show
  notes TEXT,

  -- Publishing
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES homebase_employees(id),

  -- Audit
  created_by UUID REFERENCES homebase_employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_shifts_employee ON homebase_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_sched_shifts_date ON homebase_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_sched_shifts_emp_date ON homebase_shifts(employee_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_sched_shifts_published ON homebase_shifts(is_published, shift_date) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_sched_shifts_workiz ON homebase_shifts(workiz_job_id) WHERE workiz_job_id IS NOT NULL;

-- =============================================================================
-- 4. TIME ENTRIES TABLE (clock in/out)
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES homebase_employees(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES homebase_shifts(id) ON DELETE SET NULL,

  -- Clock times
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,

  -- GPS location
  clock_in_location JSONB,   -- { lat, lng, accuracy, address }
  clock_out_location JSONB,

  -- Calculated (updated by trigger)
  total_hours DECIMAL(5,2),
  break_minutes INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- active, on_break, completed, edited

  -- Manager edits
  edited_by UUID REFERENCES homebase_employees(id),
  edit_reason TEXT,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,

  -- Metadata
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_time_employee ON homebase_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_sched_time_clock_in ON homebase_time_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_sched_time_emp_date ON homebase_time_entries(employee_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_sched_time_active ON homebase_time_entries(employee_id, status) WHERE status = 'active';

-- =============================================================================
-- 5. BREAKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES homebase_time_entries(id) ON DELETE CASCADE,

  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  break_type VARCHAR(20) DEFAULT 'unpaid',  -- paid, unpaid
  minutes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_breaks_entry ON homebase_breaks(time_entry_id);

-- =============================================================================
-- 6. TIMESHEETS TABLE (weekly aggregation)
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES homebase_employees(id) ON DELETE CASCADE,

  -- Period
  week_start DATE NOT NULL,  -- Monday
  week_end DATE NOT NULL,    -- Sunday

  -- Hours (calculated)
  total_scheduled_hours DECIMAL(5,2) DEFAULT 0,
  total_worked_hours DECIMAL(5,2) DEFAULT 0,
  regular_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,

  -- Wages
  hourly_rate DECIMAL(10,2),  -- Snapshot at time of period
  regular_pay DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  total_pay DECIMAL(10,2) DEFAULT 0,

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending',  -- pending, submitted, approved, rejected, paid
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES homebase_employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Notes
  employee_notes TEXT,
  manager_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(employee_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_sched_ts_employee ON homebase_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_sched_ts_week ON homebase_timesheets(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_sched_ts_status ON homebase_timesheets(status);
CREATE INDEX IF NOT EXISTS idx_sched_ts_pending ON homebase_timesheets(status, week_start) WHERE status IN ('pending', 'submitted');

-- =============================================================================
-- 7. TIME OFF REQUESTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES homebase_employees(id) ON DELETE CASCADE,

  -- Request type
  request_type VARCHAR(30) NOT NULL,  -- vacation, sick, personal, bereavement, jury_duty, unpaid, other

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_partial_day BOOLEAN DEFAULT FALSE,
  start_time TIME,
  end_time TIME,

  -- Hours
  total_hours DECIMAL(5,2),
  reason TEXT,

  -- Approval workflow
  status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected, cancelled
  reviewed_by UUID REFERENCES homebase_employees(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,

  -- Homebase sync
  homebase_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sched_timeoff_employee ON homebase_time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_sched_timeoff_dates ON homebase_time_off_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sched_timeoff_status ON homebase_time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_sched_timeoff_pending ON homebase_time_off_requests(status, created_at) WHERE status = 'pending';

-- =============================================================================
-- 8. SHIFT SWAPS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Requester
  requester_id UUID NOT NULL REFERENCES homebase_employees(id) ON DELETE CASCADE,
  original_shift_id UUID NOT NULL REFERENCES homebase_shifts(id) ON DELETE CASCADE,

  -- Target
  target_employee_id UUID REFERENCES homebase_employees(id) ON DELETE SET NULL,
  target_shift_id UUID REFERENCES homebase_shifts(id) ON DELETE SET NULL,

  -- Swap type
  swap_type VARCHAR(20) DEFAULT 'giveaway',  -- giveaway, swap, pickup
  reason TEXT,

  -- Workflow
  status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, declined, manager_pending, approved, rejected, cancelled

  -- Target response
  target_responded_at TIMESTAMPTZ,
  target_accepted BOOLEAN,
  target_notes TEXT,

  -- Manager approval
  requires_manager_approval BOOLEAN DEFAULT TRUE,
  manager_approved_by UUID REFERENCES homebase_employees(id),
  manager_approved_at TIMESTAMPTZ,
  manager_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sched_swap_requester ON homebase_shift_swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_sched_swap_target ON homebase_shift_swaps(target_employee_id) WHERE target_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sched_swap_status ON homebase_shift_swaps(status);

-- =============================================================================
-- 9. AVAILABILITY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS homebase_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES homebase_employees(id) ON DELETE CASCADE,

  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),

  -- Availability window
  is_available BOOLEAN DEFAULT TRUE,
  start_time TIME,  -- NULL means all day
  end_time TIME,

  notes TEXT,

  -- Effective dates (for temporary changes)
  effective_from DATE,
  effective_until DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(employee_id, day_of_week, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_sched_avail_employee ON homebase_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_sched_avail_day ON homebase_availability(day_of_week);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_homebase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_homebase_roles_updated_at
  BEFORE UPDATE ON homebase_roles
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_employees_updated_at
  BEFORE UPDATE ON homebase_employees
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_shifts_updated_at
  BEFORE UPDATE ON homebase_shifts
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_time_entries_updated_at
  BEFORE UPDATE ON homebase_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_timesheets_updated_at
  BEFORE UPDATE ON homebase_timesheets
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_time_off_updated_at
  BEFORE UPDATE ON homebase_time_off_requests
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_swaps_updated_at
  BEFORE UPDATE ON homebase_shift_swaps
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

CREATE TRIGGER update_homebase_availability_updated_at
  BEFORE UPDATE ON homebase_availability
  FOR EACH ROW EXECUTE FUNCTION update_homebase_updated_at();

-- =============================================================================
-- Calculate hours on time entry clock out
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
DECLARE
  total_minutes DECIMAL;
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    -- Calculate total minutes
    total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;

    -- Subtract breaks
    total_minutes := total_minutes - COALESCE(NEW.break_minutes, 0);

    -- Convert to hours (rounded to 2 decimal places)
    NEW.total_hours := ROUND(total_minutes / 60, 2);

    -- Update status
    IF NEW.status = 'active' OR NEW.status = 'on_break' THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_time_entry_hours_trigger
  BEFORE INSERT OR UPDATE ON homebase_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_hours();

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE homebase_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebase_availability ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (can restrict later with auth)
CREATE POLICY "Allow all on homebase_roles" ON homebase_roles FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_employees" ON homebase_employees FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_shifts" ON homebase_shifts FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_time_entries" ON homebase_time_entries FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_breaks" ON homebase_breaks FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_timesheets" ON homebase_timesheets FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_time_off_requests" ON homebase_time_off_requests FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_shift_swaps" ON homebase_shift_swaps FOR ALL USING (true);
CREATE POLICY "Allow all on homebase_availability" ON homebase_availability FOR ALL USING (true);

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================
-- Run these in Supabase dashboard under Database > Replication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE homebase_shifts;
-- ALTER PUBLICATION supabase_realtime ADD TABLE homebase_time_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE homebase_time_off_requests;
-- ALTER PUBLICATION supabase_realtime ADD TABLE homebase_shift_swaps;
