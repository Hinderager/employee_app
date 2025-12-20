// Site configuration
export interface AnalyticsSite {
  id: string;
  slug: string;
  display_name: string;
  domain: string;
  ga4_property_id?: string;
  meta_pixel_id?: string;
  google_ads_customer_id?: string;
  search_console_property?: string;
  is_main_site: boolean;
  is_active: boolean;
}

// Date range options
export type DateRange = '7d' | '30d' | '90d' | 'custom';

export interface DateRangeSelection {
  range: DateRange;
  startDate?: string;
  endDate?: string;
}

// Overview metrics (aggregated across all sites)
export interface OverviewMetrics {
  totalPageViews: number;
  totalSessions: number;
  totalUsers: number;
  avgBounceRate: number;
  totalConversions: number;
  totalAdSpend: number;
  totalAdClicks: number;
  totalAdImpressions: number;
  avgCpc: number;
  avgRoas: number;
  siteCount: number;
  // Search Console metrics
  totalSearchClicks: number;
  totalSearchImpressions: number;
  avgSearchCtr: number;
  avgSearchPosition: number;
}

// Location data
export interface LocationData {
  country: string;
  users: number;
  sessions: number;
}

// GA4 specific metrics
export interface GA4Metrics {
  pageViews: number;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  conversionRate: number;
  topPages: PageMetric[];
  trafficSources: TrafficSource[];
  dailyTrend: DailyMetric[];
  locationData: LocationData[];
  landingPages?: LandingPageMetric[];
  allPages?: PageMetric[];
  deviceData?: DeviceData[];
}

// Meta (Facebook/Instagram) metrics
export interface MetaMetrics {
  pixelEvents: number;
  conversions: number;
  reach: number;
  impressions: number;
  spend: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
}

// Google Ads metrics
export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
  campaigns: CampaignMetric[];
}

// Search Console metrics
export interface SearchConsoleMetrics {
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgPosition: number;
  topKeywords: KeywordRanking[];
}

// Site-specific detailed metrics
export interface SiteMetrics {
  siteId: string;
  siteName: string;
  domain: string;
  ga4: GA4Metrics | null;
  meta: MetaMetrics | null;
  googleAds: GoogleAdsMetrics | null;
  searchConsole: SearchConsoleMetrics | null;
  dateRange: DateRangeSelection;
  lastUpdated: string;
}

// Supporting types
export interface PageMetric {
  path: string;
  pageTitle: string;
  pageViews: number;
  avgTimeOnPage: number;
}

// Landing page metrics (entry pages)
export interface LandingPageMetric {
  path: string;
  pageTitle: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number;
}

// Device breakdown
export interface DeviceData {
  device: 'desktop' | 'mobile' | 'tablet' | string;
  sessions: number;
  users: number;
  pageViews: number;
  bounceRate: number;
  percentOfTotal: number;
}

// Page title performance (for cross-site breakdown)
export interface PageTitleMetric {
  pageTitle: string;
  views: number;
  activeUsers: number;
  viewsPerUser: number;
  avgEngagementTime: number;
  eventCount: number;
  conversions: number;
}

export interface TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  bounceRate: number;
}

export interface DailyMetric {
  date: string;
  pageViews: number;
  sessions: number;
  users: number;
  conversions: number;
}

export interface CampaignMetric {
  id: string;
  campaignId: string;
  name: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
  topKeywords: KeywordPerformance[];
}

export interface KeywordPerformance {
  keyword: string;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  qualityScore?: number;
}

export interface KeywordRanking {
  keyword: string;
  position: number;
  previousPosition?: number;
  positionChange?: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

// Column preferences
export interface ColumnPreference {
  columnId: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface TableColumnConfig {
  id: string;
  label: string;
  accessor: string;
  sortable: boolean;
  defaultVisible: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'number' | 'currency' | 'percent' | 'decimal';
}

// API Response types
export interface AnalyticsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  dateRange?: DateRangeSelection;
  lastUpdated?: string;
  isStale?: boolean;
}

// Cache entry
export interface CacheEntry {
  id: string;
  site_id: string;
  data_source: string;
  metric_type: string;
  date_range: string;
  data: unknown;
  fetched_at: string;
  expires_at: string;
}
