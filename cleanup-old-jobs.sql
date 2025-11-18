-- Delete all jobs from job_locations that are not scheduled for today
-- Run this in Supabase SQL Editor

-- Get today's date in MST
-- This will delete all jobs where scheduled_date != today

DELETE FROM job_locations
WHERE scheduled_date != CURRENT_DATE;

-- To see what would be deleted first, run this query:
-- SELECT * FROM job_locations WHERE scheduled_date != CURRENT_DATE;
