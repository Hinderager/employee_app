-- Create all_workiz_jobs table to store ALL job data from Workiz API
-- This table is the single source of truth for job data synced from Workiz
-- Synced every 5 minutes by n8n workflow

CREATE TABLE IF NOT EXISTS all_workiz_jobs (
  -- Internal ID
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Workiz Identifiers
  uuid TEXT UNIQUE NOT NULL,                    -- Workiz UUID (unique identifier)
  serial_id INTEGER NOT NULL,                   -- Job number (SerialId in Workiz)
  client_id INTEGER,                            -- Workiz ClientId

  -- Dates and Times
  job_date_time TIMESTAMP WITH TIME ZONE,       -- Scheduled job start time (JobDateTime)
  job_end_date_time TIMESTAMP WITH TIME ZONE,   -- Scheduled job end time (JobEndDateTime)
  created_date TIMESTAMP WITH TIME ZONE,        -- When job was created in Workiz (CreatedDate)
  payment_due_date TIMESTAMP WITH TIME ZONE,    -- Payment due date (PaymentDueDate)
  last_status_update TIMESTAMP WITH TIME ZONE,  -- Last time status changed (LastStatusUpdate)

  -- Derived date field for easy filtering
  scheduled_date DATE,                          -- Extracted date from job_date_time for filtering

  -- Financial
  job_total_price DECIMAL(10, 2),               -- Total price (JobTotalPrice)
  job_amount_due DECIMAL(10, 2),                -- Amount still due (JobAmountDue)
  sub_total DECIMAL(10, 2),                     -- Subtotal (SubTotal)
  item_cost DECIMAL(10, 2),                     -- Item cost (item_cost)
  tech_cost DECIMAL(10, 2),                     -- Tech cost (tech_cost)

  -- Status
  status TEXT,                                  -- Job status (Status) - e.g., "Submitted", "In progress", "Done"
  sub_status TEXT,                              -- Sub status (SubStatus)

  -- Customer Contact
  phone TEXT,                                   -- Primary phone (Phone)
  second_phone TEXT,                            -- Secondary phone (SecondPhone)
  phone_ext TEXT,                               -- Phone extension (PhoneExt)
  second_phone_ext TEXT,                        -- Second phone extension (SecondPhoneExt)
  email TEXT,                                   -- Email address (Email)

  -- Customer Name
  first_name TEXT,                              -- First name (FirstName)
  last_name TEXT,                               -- Last name (LastName)
  company TEXT,                                 -- Company name (Company)

  -- Address
  address TEXT,                                 -- Street address (Address)
  city TEXT,                                    -- City (City)
  state TEXT,                                   -- State (State)
  postal_code TEXT,                             -- Postal/ZIP code (PostalCode)
  country TEXT,                                 -- Country (Country)
  unit TEXT,                                    -- Unit/Apt number (Unit)

  -- Geolocation
  latitude DECIMAL(10, 8),                      -- Latitude (Latitude)
  longitude DECIMAL(11, 8),                     -- Longitude (Longitude)

  -- Job Details
  job_type TEXT,                                -- Type of job (JobType) - e.g., "Moving", "Junk Removal"
  job_source TEXT,                              -- Lead source (JobSource) - e.g., "Google", "Referral"
  referral_company TEXT,                        -- Referral company name (ReferralCompany)
  service_area TEXT,                            -- Service area (ServiceArea)
  timezone TEXT,                                -- Timezone (Timezone)

  -- Notes
  job_notes TEXT,                               -- Job notes (JobNotes)
  comments TEXT,                                -- Comments (Comments)

  -- Creator
  created_by TEXT,                              -- Who created the job (CreatedBy)

  -- Arrays stored as JSONB
  tags JSONB DEFAULT '[]'::jsonb,               -- Tags array (Tags)
  team JSONB DEFAULT '[]'::jsonb,               -- Assigned team members (Team) - array of {id, name}

  -- Sync metadata
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_serial_id ON all_workiz_jobs(serial_id);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_uuid ON all_workiz_jobs(uuid);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_scheduled_date ON all_workiz_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_status ON all_workiz_jobs(status);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_job_type ON all_workiz_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_phone ON all_workiz_jobs(phone);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_client_id ON all_workiz_jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_all_workiz_jobs_lat_lng ON all_workiz_jobs(latitude, longitude);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_all_workiz_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
DROP TRIGGER IF EXISTS trigger_update_all_workiz_jobs_updated_at ON all_workiz_jobs;
CREATE TRIGGER trigger_update_all_workiz_jobs_updated_at
  BEFORE UPDATE ON all_workiz_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_all_workiz_jobs_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE all_workiz_jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for all (employees viewing jobs)
CREATE POLICY "Allow read access to workiz jobs" ON all_workiz_jobs
  FOR SELECT
  USING (true);

-- Create policy to allow insert/update for system (n8n workflow)
CREATE POLICY "Allow insert/update for system" ON all_workiz_jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments to document the table structure
COMMENT ON TABLE all_workiz_jobs IS 'Complete job data synced from Workiz API - single source of truth for all job information';
COMMENT ON COLUMN all_workiz_jobs.uuid IS 'Unique Workiz job identifier (UUID from API)';
COMMENT ON COLUMN all_workiz_jobs.serial_id IS 'Human-readable job number (SerialId from API)';
COMMENT ON COLUMN all_workiz_jobs.job_date_time IS 'Scheduled start date/time from Workiz';
COMMENT ON COLUMN all_workiz_jobs.scheduled_date IS 'Date extracted from job_date_time for easy filtering';
COMMENT ON COLUMN all_workiz_jobs.status IS 'Job status: Submitted, In progress, Done, Canceled, etc.';
COMMENT ON COLUMN all_workiz_jobs.team IS 'JSON array of assigned team members [{id, name}]';
COMMENT ON COLUMN all_workiz_jobs.tags IS 'JSON array of job tags';
