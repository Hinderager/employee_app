-- Create claims table for tracking damage claims
CREATE TABLE IF NOT EXISTS claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ghl_contact_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    initial_claim_details TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    total_amount_spent DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_updates table for tracking notes and updates
CREATE TABLE IF NOT EXISTS claim_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    amount_spent DECIMAL(10, 2) DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_claims_ghl_contact ON claims(ghl_contact_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claim_updates_claim_id ON claim_updates(claim_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_claims_updated_at ON claims;
CREATE TRIGGER trigger_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_claims_updated_at();

-- Enable real-time for claims tables
ALTER PUBLICATION supabase_realtime ADD TABLE claims;
ALTER PUBLICATION supabase_realtime ADD TABLE claim_updates;
