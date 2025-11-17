-- Create jobs table to track job number to address mappings
-- This table links Workiz job numbers to physical addresses
-- Used to organize media uploads by address in Google Drive

CREATE TABLE IF NOT EXISTS jobs (
  job_number TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on address for fast lookups when querying by address
CREATE INDEX IF NOT EXISTS idx_jobs_address ON jobs(address);

-- Enable Row Level Security (RLS)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (adjust based on your auth needs)
-- For authenticated users, you might want more restrictive policies
CREATE POLICY "Allow all operations on jobs" ON jobs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE jobs IS 'Maps Workiz job numbers to physical addresses for organizing media uploads';
COMMENT ON COLUMN jobs.job_number IS 'Unique job number from Workiz';
COMMENT ON COLUMN jobs.address IS 'Physical address associated with the job';
COMMENT ON COLUMN jobs.created_at IS 'Timestamp when the job-address mapping was first created';
COMMENT ON COLUMN jobs.updated_at IS 'Timestamp when the job-address mapping was last updated';
