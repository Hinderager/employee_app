-- Create job_locations table to store scheduled jobs from Workiz
-- This table is updated every 5 minutes by n8n workflow
-- Used to display jobs on map in employee app

CREATE TABLE IF NOT EXISTS job_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL,
  job_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  job_description TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  scheduled_date DATE NOT NULL,
  workiz_job_id TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_locations_scheduled_date ON job_locations(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_job_locations_job_number ON job_locations(job_number);
CREATE INDEX IF NOT EXISTS idx_job_locations_lat_lng ON job_locations(latitude, longitude);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
CREATE TRIGGER trigger_update_job_locations_updated_at
  BEFORE UPDATE ON job_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_job_locations_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE job_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access for all (employees viewing the map)
CREATE POLICY "Allow read access to job locations" ON job_locations
  FOR SELECT
  USING (true);

-- Create policy to allow insert/update for system (n8n workflow)
-- In production, you may want to restrict this to a specific service role
CREATE POLICY "Allow insert/update for system" ON job_locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments to document the table structure
COMMENT ON TABLE job_locations IS 'Stores scheduled job locations from Workiz for map display in employee app';
COMMENT ON COLUMN job_locations.id IS 'Unique identifier for the record';
COMMENT ON COLUMN job_locations.job_number IS 'Job number from Workiz (unique identifier)';
COMMENT ON COLUMN job_locations.job_type IS 'Type of job (e.g., Moving, Junk Removal)';
COMMENT ON COLUMN job_locations.job_start_time IS 'Scheduled start time for the job';
COMMENT ON COLUMN job_locations.job_description IS 'Description of the work to be done';
COMMENT ON COLUMN job_locations.customer_name IS 'Name of the customer';
COMMENT ON COLUMN job_locations.customer_phone IS 'Customer contact phone number';
COMMENT ON COLUMN job_locations.address IS 'Physical address of the job site';
COMMENT ON COLUMN job_locations.latitude IS 'Latitude coordinate for map pin';
COMMENT ON COLUMN job_locations.longitude IS 'Longitude coordinate for map pin';
COMMENT ON COLUMN job_locations.scheduled_date IS 'Date the job is scheduled (for filtering today''s jobs)';
COMMENT ON COLUMN job_locations.workiz_job_id IS 'Original Workiz job ID for reference';
COMMENT ON COLUMN job_locations.last_synced_at IS 'Timestamp of last sync from Workiz';
COMMENT ON COLUMN job_locations.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN job_locations.updated_at IS 'Timestamp when record was last updated';
