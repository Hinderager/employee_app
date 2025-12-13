import { GoogleAdsMetrics, CampaignMetric, KeywordPerformance } from '../../../admin/website-analytics/types/analytics';
import { calculateDateRange } from './cacheManager';

// Google Ads API client
// Requires: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET,
//           GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID

interface GoogleAdsConfig {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId: string;
}

function getGoogleAdsConfig(): GoogleAdsConfig | null {
  const config = {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
  };

  if (!config.developerToken || !config.refreshToken) {
    return null;
  }

  return config;
}

async function getAccessToken(config: GoogleAdsConfig): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error('[googleAdsClient] Error getting access token:', error);
    return null;
  }
}

async function queryGoogleAds(
  customerId: string,
  query: string,
  config: GoogleAdsConfig
): Promise<unknown[] | null> {
  const accessToken = await getAccessToken(config);
  if (!accessToken) {
    return null;
  }

  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': config.developerToken,
          'login-customer-id': config.loginCustomerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[googleAdsClient] API error:', error);
      return null;
    }

    const data = await response.json();
    // Google Ads API returns array of batches, each with results
    const results: unknown[] = [];
    for (const batch of data) {
      if (batch.results) {
        results.push(...batch.results);
      }
    }
    return results;
  } catch (error) {
    console.error('[googleAdsClient] Error querying Google Ads:', error);
    return null;
  }
}

export async function getGoogleAdsOverviewData(
  customerId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Partial<GoogleAdsMetrics> | null> {
  const config = getGoogleAdsConfig();
  if (!config || !customerId) {
    console.log('[googleAdsClient] Missing configuration or customer ID');
    return null;
  }

  try {
    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    // Format dates for Google Ads API (YYYY-MM-DD to YYYYMMDD)
    const startFormatted = start.replace(/-/g, '');
    const endFormatted = end.replace(/-/g, '');

    const query = `
      SELECT
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.average_cpc,
        metrics.ctr
      FROM customer
      WHERE segments.date BETWEEN '${startFormatted}' AND '${endFormatted}'
    `;

    const results = await queryGoogleAds(customerId.replace(/-/g, ''), query, config);

    if (!results || results.length === 0) {
      return {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        cpc: 0,
        ctr: 0,
        roas: 0,
      };
    }

    // Aggregate results
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCostMicros = 0;
    let totalConversions = 0;

    for (const result of results as Array<{ metrics?: Record<string, number> }>) {
      const metrics = result.metrics || {};
      totalImpressions += metrics.impressions || 0;
      totalClicks += metrics.clicks || 0;
      totalCostMicros += metrics.cost_micros || 0;
      totalConversions += metrics.conversions || 0;
    }

    const spend = totalCostMicros / 1000000; // Convert micros to dollars

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend,
      conversions: totalConversions,
      cpc: totalClicks > 0 ? spend / totalClicks : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      roas: spend > 0 ? (totalConversions * 100) / spend : 0, // Assuming $100 avg conversion value
    };
  } catch (error) {
    console.error('[googleAdsClient] Error fetching overview:', error);
    return null;
  }
}

export async function getGoogleAdsDetailedData(
  customerId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<GoogleAdsMetrics | null> {
  const config = getGoogleAdsConfig();
  if (!config || !customerId) {
    return null;
  }

  try {
    const { start, end } = calculateDateRange(dateRange, startDate, endDate);
    const startFormatted = start.replace(/-/g, '');
    const endFormatted = end.replace(/-/g, '');

    // Fetch campaigns
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.average_cpc,
        metrics.ctr
      FROM campaign
      WHERE segments.date BETWEEN '${startFormatted}' AND '${endFormatted}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 20
    `;

    const campaignResults = await queryGoogleAds(customerId.replace(/-/g, ''), campaignQuery, config);

    const campaigns: CampaignMetric[] = [];
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalConversions = 0;

    for (const result of (campaignResults || []) as Array<{
      campaign?: { id?: string; name?: string; status?: string };
      metrics?: Record<string, number>;
    }>) {
      const campaign = result.campaign || {};
      const metrics = result.metrics || {};

      const spend = (metrics.cost_micros || 0) / 1000000;
      const clicks = metrics.clicks || 0;
      const impressions = metrics.impressions || 0;
      const conversions = metrics.conversions || 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalConversions += conversions;

      campaigns.push({
        id: campaign.id || '',
        campaignId: campaign.id || '',
        name: campaign.name || 'Unknown',
        campaignName: campaign.name || 'Unknown',
        status: campaign.status || 'UNKNOWN',
        impressions,
        clicks,
        spend,
        conversions,
        cpc: clicks > 0 ? spend / clicks : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        roas: spend > 0 ? (conversions * 100) / spend : 0,
        topKeywords: [], // Would need separate query for keywords
      });
    }

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      conversions: totalConversions,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      roas: totalSpend > 0 ? (totalConversions * 100) / totalSpend : 0,
      campaigns,
    };
  } catch (error) {
    console.error('[googleAdsClient] Error fetching detailed data:', error);
    return null;
  }
}

export async function getGoogleAdsCampaignKeywords(
  customerId: string,
  campaignId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<KeywordPerformance[]> {
  const config = getGoogleAdsConfig();
  if (!config || !customerId) {
    return [];
  }

  try {
    const { start, end } = calculateDateRange(dateRange, startDate, endDate);
    const startFormatted = start.replace(/-/g, '');
    const endFormatted = end.replace(/-/g, '');

    const query = `
      SELECT
        ad_group_criterion.keyword.text,
        metrics.impressions,
        metrics.clicks,
        metrics.average_cpc,
        metrics.conversions,
        ad_group_criterion.quality_info.quality_score
      FROM keyword_view
      WHERE segments.date BETWEEN '${startFormatted}' AND '${endFormatted}'
        AND campaign.id = ${campaignId}
      ORDER BY metrics.impressions DESC
      LIMIT 20
    `;

    const results = await queryGoogleAds(customerId.replace(/-/g, ''), query, config);

    return (results || []).map((result: unknown) => {
      const r = result as {
        adGroupCriterion?: { keyword?: { text?: string }; qualityInfo?: { qualityScore?: number } };
        metrics?: Record<string, number>;
      };
      const criterion = r.adGroupCriterion || {};
      const metrics = r.metrics || {};

      return {
        keyword: criterion.keyword?.text || '',
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        cpc: (metrics.average_cpc || 0) / 1000000,
        conversions: metrics.conversions || 0,
        qualityScore: criterion.qualityInfo?.qualityScore,
      };
    });
  } catch (error) {
    console.error('[googleAdsClient] Error fetching campaign keywords:', error);
    return [];
  }
}
