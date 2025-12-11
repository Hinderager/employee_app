-- Enhanced Claims Database Schema
-- Run this in Supabase SQL Editor

-- 1. Add sheets_done field to claim_updates table
ALTER TABLE claim_updates
ADD COLUMN IF NOT EXISTS sheets_done BOOLEAN DEFAULT FALSE;

-- 2. Create claim_photos table for storing photo references
CREATE TABLE IF NOT EXISTS claim_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  update_id UUID REFERENCES claim_updates(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claim_photos_claim_id ON claim_photos(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_photos_update_id ON claim_photos(update_id);

-- 3. Enable RLS on claim_photos
ALTER TABLE claim_photos ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on claim_photos" ON claim_photos
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Create storage bucket for claim photos (run via Supabase Dashboard or API)
-- Go to Storage > Create new bucket > Name: "claim-photos" > Public: true

-- 5. Storage bucket policy (run in SQL after creating bucket)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('claim-photos', 'claim-photos', true)
-- ON CONFLICT (id) DO UPDATE SET public = true;

-- Grant access to the bucket
-- CREATE POLICY "Public access for claim photos" ON storage.objects
--   FOR ALL USING (bucket_id = 'claim-photos');
