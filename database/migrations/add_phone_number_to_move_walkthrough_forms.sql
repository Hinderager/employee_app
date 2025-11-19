-- Migration: Add phone_number support to move_walkthrough_forms table
-- This migration enables searching by phone number and supports forms without job numbers

-- Add phone_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'move_walkthrough_forms'
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE move_walkthrough_forms
    ADD COLUMN phone_number VARCHAR(20);

    COMMENT ON COLUMN move_walkthrough_forms.phone_number IS 'Normalized phone number (digits only) for customer lookup';
  END IF;
END $$;

-- Make job_number nullable if it isn't already
-- This allows creating walk-through forms before a job is booked
DO $$
BEGIN
  ALTER TABLE move_walkthrough_forms
  ALTER COLUMN job_number DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Column is already nullable or doesn't exist, ignore
    NULL;
END $$;

-- Ensure job_number has a unique constraint (but allows multiple NULLs)
-- Drop existing constraint if it exists
DO $$
BEGIN
  ALTER TABLE move_walkthrough_forms
  DROP CONSTRAINT IF EXISTS move_walkthrough_forms_job_number_key;

  -- Add unique constraint (allows multiple NULL values)
  ALTER TABLE move_walkthrough_forms
  ADD CONSTRAINT move_walkthrough_forms_job_number_key
  UNIQUE (job_number);
EXCEPTION
  WHEN OTHERS THEN
    -- Constraint might already exist or column doesn't exist, ignore
    NULL;
END $$;

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_move_walkthrough_forms_phone_number
ON move_walkthrough_forms(phone_number);

-- Create index on job_number if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_move_walkthrough_forms_job_number
ON move_walkthrough_forms(job_number);

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'move_walkthrough_forms'
  AND column_name IN ('job_number', 'phone_number', 'address', 'form_data')
ORDER BY ordinal_position;
