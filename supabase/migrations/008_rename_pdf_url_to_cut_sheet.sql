-- Migration: Rename pdf_url column to cut_sheet
-- Date: 2025-11-20
-- Purpose: Rename pdf_url to cut_sheet for better semantic clarity

-- Rename the column
ALTER TABLE move_quote
RENAME COLUMN pdf_url TO cut_sheet;

-- Update comment
COMMENT ON COLUMN move_quote.cut_sheet IS 'URL of the generated PDF cut sheet for movers, stored in Google Drive';
