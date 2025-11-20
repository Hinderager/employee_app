-- Migration: Setup automatic quote number generation starting at 1137
-- Date: 2025-11-19

-- Create a sequence for quote numbers starting at 1137
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START WITH 1137;

-- Create a function to generate the next quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_num INTEGER;
  quote_num VARCHAR(50);
BEGIN
  -- Get the next sequence number
  next_num := nextval('quote_number_seq');

  -- Format as Q-XXXX
  quote_num := 'Q-' || next_num;

  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quote_number on insert if not provided
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := generate_quote_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_quote_number ON move_quote;

-- Create trigger to set quote_number automatically
CREATE TRIGGER trigger_set_quote_number
  BEFORE INSERT ON move_quote
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_number();

-- Update existing records to have quote numbers (starting from 1137)
-- Only update records that don't have a quote_number yet
DO $$
DECLARE
  rec RECORD;
  next_num INTEGER;
BEGIN
  next_num := 1137;

  FOR rec IN
    SELECT id
    FROM move_quote
    WHERE quote_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE move_quote
    SET quote_number = 'Q-' || next_num
    WHERE id = rec.id;

    next_num := next_num + 1;
  END LOOP;

  -- Set the sequence to continue from where we left off
  PERFORM setval('quote_number_seq', next_num);
END $$;

COMMENT ON SEQUENCE quote_number_seq IS 'Sequence for generating quote numbers starting at 1137';
COMMENT ON FUNCTION generate_quote_number() IS 'Generates the next quote number in format Q-XXXX';
COMMENT ON FUNCTION set_quote_number() IS 'Trigger function to auto-assign quote numbers to new quotes';
