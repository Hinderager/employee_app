# Database Migration: Rename to move_quote and Add Columns

## Overview
This migration renames the `move_walkthrough_forms` table to `move_quote` and adds new columns for quote management.

## Changes Made

### 1. Table Rename
- **Old name:** `move_walkthrough_forms`
- **New name:** `move_quote`

### 2. New Columns Added
- `quote_number` (VARCHAR(50), UNIQUE) - Unique identifier for quotes shown to customers
- `quote_url` (VARCHAR(255)) - Custom URL path for the quote (e.g., "/quote/1234")
- `quote_url_expires_at` (TIMESTAMP WITH TIME ZONE) - Expiration date for the quote URL

### 3. Automatic Features
- **Auto-expiration:** Quote URLs automatically expire 2 months after creation
- **Trigger:** Automatically sets expiration date when a quote_url is added
- **Indexes:** Added for faster lookups on quote_number, quote_url, and expiration date

## How to Apply the Migration

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations/005_rename_to_move_quote_and_add_columns.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the project directory
cd "Employee App"

# Link your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push

# Or apply the specific migration
supabase migration up
```

### Option 3: Manual SQL Execution
1. Connect to your Supabase database using your preferred SQL client
2. Execute the contents of `supabase/migrations/005_rename_to_move_quote_and_add_columns.sql`

## Code Changes

The following API routes have been updated to use the new table name:

✅ `app/api/move-wt/load-job/route.ts`
✅ `app/api/move-wt/save-form/route.ts`
✅ `app/api/quote/get-quote/route.ts`

## Verification

After applying the migration, verify it worked:

```sql
-- Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'move_quote';

-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'move_quote'
  AND column_name IN ('quote_number', 'quote_url', 'quote_url_expires_at');

-- Check indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'move_quote';

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'move_quote';
```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_set_quote_url_expiration ON move_quote;

-- Remove function
DROP FUNCTION IF EXISTS set_quote_url_expiration();

-- Remove indexes
DROP INDEX IF EXISTS idx_move_quote_quote_number;
DROP INDEX IF EXISTS idx_move_quote_quote_url;
DROP INDEX IF EXISTS idx_move_quote_expires_at;

-- Remove columns
ALTER TABLE move_quote DROP COLUMN IF EXISTS quote_number;
ALTER TABLE move_quote DROP COLUMN IF EXISTS quote_url;
ALTER TABLE move_quote DROP COLUMN IF EXISTS quote_url_expires_at;

-- Rename table back
ALTER TABLE move_quote RENAME TO move_walkthrough_forms;
```

## Usage Examples

### Setting a Quote URL
```sql
-- When creating/updating a quote, set the quote_url
UPDATE move_quote
SET quote_url = '/quote/1234',
    quote_number = 'Q-2025-001'
WHERE id = 'your-quote-id';

-- The expiration date will be automatically set to 2 months from now
```

### Checking Expired URLs
```sql
-- Find all expired quote URLs
SELECT id, quote_number, quote_url, quote_url_expires_at
FROM move_quote
WHERE quote_url IS NOT NULL
  AND quote_url_expires_at < NOW();
```

### Cleaning Up Expired URLs
```sql
-- Remove expired quote URLs
UPDATE move_quote
SET quote_url = NULL,
    quote_url_expires_at = NULL
WHERE quote_url_expires_at < NOW();
```

## Notes

- The migration preserves all existing data in the table
- Existing records will have NULL values for the new columns
- The trigger only sets expiration dates for new records or when quote_url is updated
- Make sure to backup your database before running the migration
- The application code has been updated to use the new table name

## Support

If you encounter any issues with the migration:
1. Check the Supabase logs for error details
2. Verify your database user has the necessary permissions (ALTER TABLE, CREATE INDEX, CREATE FUNCTION)
3. Ensure no other processes are accessing the table during migration
