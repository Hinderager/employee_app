-- Analytics Dashboard Database Schema
-- Run this in Supabase SQL Editor

-- Table: analytics_sites
-- Stores configuration for all tracked websites
CREATE TABLE IF NOT EXISTS analytics_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  ga4_property_id VARCHAR(50),
  meta_pixel_id VARCHAR(50),
  google_ads_customer_id VARCHAR(50),
  search_console_property VARCHAR(255),
  is_main_site BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: analytics_cache
-- Caches API responses to avoid rate limits (4-hour TTL default)
CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES analytics_sites(id) ON DELETE CASCADE,
  data_source VARCHAR(50) NOT NULL, -- 'ga4', 'meta', 'google_ads', 'search_console'
  metric_type VARCHAR(100) NOT NULL, -- 'overview', 'keywords', 'campaigns', etc.
  date_range VARCHAR(50) NOT NULL, -- '7d', '30d', '90d', 'custom'
  start_date DATE,
  end_date DATE,
  data JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(site_id, data_source, metric_type, date_range, start_date, end_date)
);

-- Table: keyword_rankings_history
-- Stores historical keyword ranking data for trend analysis
CREATE TABLE IF NOT EXISTS keyword_rankings_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES analytics_sites(id) ON DELETE CASCADE,
  keyword VARCHAR(500) NOT NULL,
  position DECIMAL(5,2),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4),
  recorded_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, keyword, recorded_date)
);

-- Table: analytics_column_preferences
-- Stores user-specific column visibility preferences
CREATE TABLE IF NOT EXISTS analytics_column_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_identifier VARCHAR(255) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  visible_columns JSONB NOT NULL DEFAULT '[]',
  column_order JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_identifier, table_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_cache_site_source ON analytics_cache(site_id, data_source);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_site_date ON keyword_rankings_history(site_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings_history(keyword);

-- Enable RLS
ALTER TABLE analytics_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rankings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_column_preferences ENABLE ROW LEVEL SECURITY;

-- Allow all operations (internal app, no auth required)
CREATE POLICY "Allow all on analytics_sites" ON analytics_sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analytics_cache" ON analytics_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on keyword_rankings_history" ON keyword_rankings_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on analytics_column_preferences" ON analytics_column_preferences FOR ALL USING (true) WITH CHECK (true);

-- Seed data for all 15 sites
INSERT INTO analytics_sites (slug, display_name, domain, is_main_site) VALUES
('topshelfpros', 'Top Shelf Pros (Main)', 'topshelfpros.com', true),
('boise-commercial-movers', 'Boise Commercial Movers', 'boisecommercialmovers.com', false),
('boise-construction-debris-removal', 'Boise Construction Debris', 'boiseconstructiondebrisremoval.com', false),
('boise-couch-removal', 'Boise Couch Removal', 'boisecouchremoval.com', false),
('boise-demolition', 'Boise Demolition', 'boisedemolition.com', false),
('boise-dumpster-rental', 'Boise Dumpster Rental', 'boisedumpsterrental.com', false),
('boise-estate-cleanout', 'Boise Estate Cleanout', 'boiseestatecleanout.com', false),
('boise-hoarding-cleanup', 'Boise Hoarding Cleanup', 'boisehoardingcleanup.com', false),
('boise-hot-tub-removal', 'Boise Hot Tub Removal', 'boisehottubremoval.com', false),
('boise-junk-removal', 'Boise Junk Removal', 'boisejunkremoval.com', false),
('boise-movers', 'Boise Movers', 'boisemovers.com', false),
('boise-tire-removal', 'Boise Tire Removal', 'boisetireremoval.com', false),
('mobile-home-demolition-boise', 'Mobile Home Demolition', 'mobilehomedemolitionboise.com', false),
('property-cleanout-boise', 'Property Cleanout Boise', 'propertycleanoutboise.com', false)
ON CONFLICT (slug) DO NOTHING;
