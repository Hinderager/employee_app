-- Create supplies_needed table for Supplies Needed feature
CREATE TABLE IF NOT EXISTS supplies_needed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_by VARCHAR(255),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  sort_order INTEGER DEFAULT 0
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_supplies_needed_completed ON supplies_needed(completed);
CREATE INDEX IF NOT EXISTS idx_supplies_needed_created_at ON supplies_needed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplies_needed_sort_order ON supplies_needed(sort_order);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE supplies_needed ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all operations on supplies_needed" ON supplies_needed
  FOR ALL
  USING (true)
  WITH CHECK (true);
