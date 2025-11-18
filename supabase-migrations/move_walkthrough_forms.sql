-- Create table for Move Walkthrough Forms
-- This table stores form data linked to job numbers and addresses

CREATE TABLE IF NOT EXISTS move_walkthrough_forms (
  id BIGSERIAL PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on address for faster lookups
CREATE INDEX IF NOT EXISTS idx_move_walkthrough_forms_address ON move_walkthrough_forms(address);

-- Create index on job_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_move_walkthrough_forms_job_number ON move_walkthrough_forms(job_number);

-- Enable Row Level Security (RLS)
ALTER TABLE move_walkthrough_forms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this based on your auth setup)
CREATE POLICY "Allow all operations on move_walkthrough_forms" ON move_walkthrough_forms
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE move_walkthrough_forms IS 'Stores move walkthrough form data for each job, linked to job number and address';
