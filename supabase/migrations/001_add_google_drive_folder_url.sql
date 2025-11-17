-- Add google_drive_folder_url column to jobs_from_pictures table
-- This stores the persistent Google Drive folder URL for each job's address

ALTER TABLE jobs_from_pictures
ADD COLUMN IF NOT EXISTS google_drive_folder_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN jobs_from_pictures.google_drive_folder_url IS 'Google Drive folder URL for the address-based folder where job photos/videos are stored';
