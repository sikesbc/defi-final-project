-- Initial database schema for Crypto Attack Tracker

-- Create attacks table
CREATE TABLE IF NOT EXISTS attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_name VARCHAR(255) NOT NULL,
    attack_date DATE NOT NULL,
    attack_type VARCHAR(100) NOT NULL,
    loss_amount_usd DECIMAL(20, 2) NOT NULL,
    description TEXT,
    source_url TEXT,
    blockchain VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(50) NOT NULL,
    UNIQUE(protocol_name, attack_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attacks_date ON attacks(attack_date DESC);
CREATE INDEX IF NOT EXISTS idx_attacks_protocol ON attacks(protocol_name);
CREATE INDEX IF NOT EXISTS idx_attacks_type ON attacks(attack_type);
CREATE INDEX IF NOT EXISTS idx_attacks_loss ON attacks(loss_amount_usd DESC);

-- Create refresh_logs table for tracking data refresh operations
CREATE TABLE IF NOT EXISTS refresh_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refresh_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL,
    records_fetched INTEGER,
    records_inserted INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on refresh_logs
CREATE INDEX IF NOT EXISTS idx_refresh_logs_created ON refresh_logs(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_attacks_updated_at ON attacks;
CREATE TRIGGER update_attacks_updated_at
    BEFORE UPDATE ON attacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, can be configured later)
ALTER TABLE attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (can be restricted later)
CREATE POLICY "Enable all operations for authenticated users" ON attacks
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable all operations for authenticated users" ON refresh_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

