-- Create job_materials table for real-time collaborative billing
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  materials JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on job_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_materials_job_number ON job_materials(job_number);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_job_materials_updated_at
  BEFORE UPDATE ON job_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on job_materials" ON job_materials
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE job_materials;
