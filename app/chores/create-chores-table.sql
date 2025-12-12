-- Create chores table for To-Do's feature
CREATE TABLE IF NOT EXISTS chores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_by VARCHAR(255),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chores_completed ON chores(completed);
CREATE INDEX IF NOT EXISTS idx_chores_created_at ON chores(created_at DESC);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all operations on chores" ON chores
  FOR ALL
  USING (true)
  WITH CHECK (true);
