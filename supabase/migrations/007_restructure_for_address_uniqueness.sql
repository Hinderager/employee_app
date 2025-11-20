-- Migration: Restructure move_quote for address-based uniqueness
-- Date: 2025-11-19
-- Purpose: Use customer home address as unique key, store arrays of job numbers and phone numbers

-- Add new columns
ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS customer_home_address TEXT;

ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS job_numbers TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS phone_numbers TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data
-- Convert existing job_number to job_numbers array
UPDATE move_quote
SET job_numbers = ARRAY[job_number]
WHERE job_number IS NOT NULL
  AND job_number != ''
  AND (job_numbers IS NULL OR array_length(job_numbers, 1) IS NULL);

-- Convert existing phone_number to phone_numbers array
UPDATE move_quote
SET phone_numbers = ARRAY[phone_number]
WHERE phone_number IS NOT NULL
  AND phone_number != ''
  AND (phone_numbers IS NULL OR array_length(phone_numbers, 1) IS NULL);

-- Migrate existing address to customer_home_address
-- Use the 'address' field as the initial customer_home_address
UPDATE move_quote
SET customer_home_address = address
WHERE customer_home_address IS NULL
  AND address IS NOT NULL
  AND address != '';

-- Handle duplicates before adding unique constraint
-- For duplicate addresses, keep the most recent one and merge data
DO $$
DECLARE
  duplicate_address RECORD;
  rec RECORD;
  keep_record RECORD;
  all_job_nums TEXT[];
  all_phone_nums TEXT[];
BEGIN
  -- Find all duplicate addresses
  FOR duplicate_address IN
    SELECT customer_home_address
    FROM move_quote
    WHERE customer_home_address IS NOT NULL
    GROUP BY customer_home_address
    HAVING COUNT(*) > 1
  LOOP
    -- Get the most recent record for this address (to keep)
    SELECT * INTO keep_record
    FROM move_quote
    WHERE customer_home_address = duplicate_address.customer_home_address
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Collect all job numbers from all records with this address
    SELECT array_agg(DISTINCT job_num) INTO all_job_nums
    FROM (
      SELECT unnest(job_numbers) as job_num
      FROM move_quote
      WHERE customer_home_address = duplicate_address.customer_home_address
    ) as all_jobs;

    -- Collect all phone numbers from all records with this address
    SELECT array_agg(DISTINCT phone_num) INTO all_phone_nums
    FROM (
      SELECT unnest(phone_numbers) as phone_num
      FROM move_quote
      WHERE customer_home_address = duplicate_address.customer_home_address
    ) as all_phones;

    -- Update the kept record with merged arrays
    UPDATE move_quote
    SET job_numbers = all_job_nums,
        phone_numbers = all_phone_nums
    WHERE id = keep_record.id;

    -- Delete all other records with this address
    DELETE FROM move_quote
    WHERE customer_home_address = duplicate_address.customer_home_address
      AND id != keep_record.id;

    RAISE NOTICE 'Merged duplicates for address: % (kept id: %)', duplicate_address.customer_home_address, keep_record.id;
  END LOOP;
END $$;

-- Add unique constraint on customer_home_address
-- Only add if customer_home_address is not null
ALTER TABLE move_quote
DROP CONSTRAINT IF EXISTS unique_customer_home_address;

CREATE UNIQUE INDEX IF NOT EXISTS unique_customer_home_address
ON move_quote(customer_home_address)
WHERE customer_home_address IS NOT NULL;

-- Create indexes for array searches
CREATE INDEX IF NOT EXISTS idx_move_quote_job_numbers ON move_quote USING GIN(job_numbers);
CREATE INDEX IF NOT EXISTS idx_move_quote_phone_numbers ON move_quote USING GIN(phone_numbers);

-- Helper function to add item to array if not exists
CREATE OR REPLACE FUNCTION add_to_array_if_not_exists(arr TEXT[], item TEXT)
RETURNS TEXT[] AS $$
BEGIN
  IF item IS NULL OR item = '' THEN
    RETURN arr;
  END IF;

  IF arr IS NULL THEN
    RETURN ARRAY[item];
  END IF;

  IF item = ANY(arr) THEN
    RETURN arr;
  ELSE
    RETURN array_append(arr, item);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update comments
COMMENT ON COLUMN move_quote.customer_home_address IS 'Customer home address - unique identifier for the quote (marked by checkbox in form)';
COMMENT ON COLUMN move_quote.job_numbers IS 'Array of all Workiz job numbers associated with this address';
COMMENT ON COLUMN move_quote.phone_numbers IS 'Array of all phone numbers associated with this address';

-- Note: Keeping old job_number and phone_number columns for backward compatibility
-- They can be removed in a future migration after confirming everything works
COMMENT ON COLUMN move_quote.job_number IS 'DEPRECATED: Use job_numbers array instead. Kept for backward compatibility.';
COMMENT ON COLUMN move_quote.phone_number IS 'DEPRECATED: Use phone_numbers array instead. Kept for backward compatibility.';
