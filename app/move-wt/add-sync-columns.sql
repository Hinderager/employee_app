-- Run this SQL in Supabase Dashboard SQL Editor
-- Adds columns for bidirectional sync race condition prevention

-- Add sync tracking columns
ALTER TABLE move_quote ADD COLUMN IF NOT EXISTS last_sync_source TEXT;
ALTER TABLE move_quote ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Add index for faster sync source lookups
CREATE INDEX IF NOT EXISTS idx_move_quote_last_sync ON move_quote(last_sync_source, last_sync_at);

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'move_quote'
AND column_name IN ('last_sync_source', 'last_sync_at');
