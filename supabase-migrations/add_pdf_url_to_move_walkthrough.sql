-- Add pdf_url column to move_walkthrough_forms table
-- This will store the URL of the generated PDF cut sheet for movers

ALTER TABLE move_walkthrough_forms
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comment to column
COMMENT ON COLUMN move_walkthrough_forms.pdf_url IS 'URL of the generated PDF cut sheet stored in Google Drive';
