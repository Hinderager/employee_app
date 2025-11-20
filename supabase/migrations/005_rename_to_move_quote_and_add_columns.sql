-- Migration: Rename move_walkthrough_forms to move_quote and add new columns
-- Date: 2025-11-19

-- Rename the table
ALTER TABLE move_walkthrough_forms RENAME TO move_quote;

-- Add quote_number column (unique identifier for the quote)
ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS quote_number VARCHAR(50) UNIQUE;

-- Add quote_url column (the custom URL path for the quote, e.g., "/quote/1234")
ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS quote_url VARCHAR(255);

-- Add quote_url_expires_at column (timestamp when the URL expires, default 2 months from creation)
ALTER TABLE move_quote
ADD COLUMN IF NOT EXISTS quote_url_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index on quote_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_move_quote_quote_number ON move_quote(quote_number);

-- Create index on quote_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_move_quote_quote_url ON move_quote(quote_url);

-- Create index on quote_url_expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_move_quote_expires_at ON move_quote(quote_url_expires_at);

-- Add a function to automatically set expiration date (2 months from now) on insert
CREATE OR REPLACE FUNCTION set_quote_url_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_url IS NOT NULL AND NEW.quote_url_expires_at IS NULL THEN
    NEW.quote_url_expires_at := NOW() + INTERVAL '2 months';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiration automatically
DROP TRIGGER IF EXISTS trigger_set_quote_url_expiration ON move_quote;
CREATE TRIGGER trigger_set_quote_url_expiration
  BEFORE INSERT OR UPDATE ON move_quote
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_url_expiration();

-- Update any existing records to set quote_url_expires_at if quote_url exists
UPDATE move_quote
SET quote_url_expires_at = created_at + INTERVAL '2 months'
WHERE quote_url IS NOT NULL
  AND quote_url_expires_at IS NULL
  AND created_at IS NOT NULL;

COMMENT ON TABLE move_quote IS 'Stores moving quotes and estimates';
COMMENT ON COLUMN move_quote.quote_number IS 'Unique quote identifier shown to customers';
COMMENT ON COLUMN move_quote.quote_url IS 'Custom URL path for the quote (e.g., /quote/1234)';
COMMENT ON COLUMN move_quote.quote_url_expires_at IS 'Expiration date for the quote URL (default 2 months from creation)';
