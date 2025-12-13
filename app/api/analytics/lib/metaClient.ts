import { MetaMetrics } from '../../../admin/website-analytics/types/analytics';
import { calculateDateRange } from './cacheManager';

// Meta Marketing API client
// Requires: META_ACCESS_TOKEN, META_AD_ACCOUNT_ID environment variables

interface MetaConfig {
  accessToken: string;
  adAccountId: string;
}

function getMetaConfig(): MetaConfig | null {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return null;
  }

  return { accessToken, adAccountId };
}

async function fetchMetaApi(
  endpoint: string,
  params: Record<string, string>,
  config: MetaConfig
): Promise<unknown | null> {
  try {
    const url = new URL(`https://graph.facebook.com/v18.0/${endpoint}`);
    url.searchParams.append('access_token', config.accessToken);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      console.error('[metaClient] API error:', error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[metaClient] Error fetching from Meta API:', error);
    return null;
  }
}

export async function getMetaOverviewData(
  pixelId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Partial<MetaMetrics> | null> {
  const config = getMetaConfig();
  if (!config) {
    console.log('[metaClient] Missing configuration');
    return null;
  }

  try {
    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    // Get ad account insights
    const accountId = config.adAccountId.startsWith('act_')
      ? config.adAccountId
      : `act_${config.adAccountId}`;

    const insights = await fetchMetaApi(
      `${accountId}/insights`,
      {
        fields: 'impressions,reach,clicks,spend,cpm,cpc,ctr,actions',
        time_range: JSON.stringify({ since: start, until: end }),
        level: 'account',
      },
      config
    ) as { data?: Array<Record<string, unknown>> } | null;

    if (!insights?.data?.[0]) {
      return {
        pixelEvents: 0,
        conversions: 0,
        reach: 0,
        impressions: 0,
        spend: 0,
        clicks: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
      };
    }

    const data = insights.data[0];

    // Count conversions from actions
    const actions = data.actions as Array<{ action_type: string; value: string }> || [];
    const conversions = actions
      .filter(a => ['purchase', 'lead', 'complete_registration', 'contact'].includes(a.action_type))
      .reduce((sum, a) => sum + parseInt(a.value || '0'), 0);

    // Get pixel events if pixelId provided
    let pixelEvents = 0;
    if (pixelId) {
      const pixelStats = await fetchMetaApi(
        `${pixelId}/stats`,
        {
          start_time: new Date(start).getTime().toString(),
          end_time: new Date(end).getTime().toString(),
        },
        config
      ) as { data?: Array<{ count: number }> } | null;

      pixelEvents = pixelStats?.data?.reduce((sum, d) => sum + (d.count || 0), 0) || 0;
    }

    return {
      pixelEvents,
      conversions,
      reach: parseInt(String(data.reach || 0)),
      impressions: parseInt(String(data.impressions || 0)),
      spend: parseFloat(String(data.spend || 0)),
      clicks: parseInt(String(data.clicks || 0)),
      cpm: parseFloat(String(data.cpm || 0)),
      cpc: parseFloat(String(data.cpc || 0)),
      ctr: parseFloat(String(data.ctr || 0)),
    };
  } catch (error) {
    console.error('[metaClient] Error fetching overview:', error);
    return null;
  }
}

export async function getMetaDetailedData(
  pixelId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<MetaMetrics | null> {
  // For now, detailed data is the same as overview
  // Could be extended to include campaign breakdowns, etc.
  const overview = await getMetaOverviewData(pixelId, dateRange, startDate, endDate);

  if (!overview) {
    return null;
  }

  return {
    pixelEvents: overview.pixelEvents || 0,
    conversions: overview.conversions || 0,
    reach: overview.reach || 0,
    impressions: overview.impressions || 0,
    spend: overview.spend || 0,
    clicks: overview.clicks || 0,
    cpm: overview.cpm || 0,
    cpc: overview.cpc || 0,
    ctr: overview.ctr || 0,
  };
}

export async function getMetaCampaigns(
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}>> {
  const config = getMetaConfig();
  if (!config) {
    return [];
  }

  try {
    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    const accountId = config.adAccountId.startsWith('act_')
      ? config.adAccountId
      : `act_${config.adAccountId}`;

    const campaigns = await fetchMetaApi(
      `${accountId}/campaigns`,
      {
        fields: 'id,name,status,insights.time_range(' +
          JSON.stringify({ since: start, until: end }) +
          '){impressions,clicks,spend,actions}',
        limit: '20',
      },
      config
    ) as { data?: Array<{
      id: string;
      name: string;
      status: string;
      insights?: { data?: Array<Record<string, unknown>> };
    }> } | null;

    return (campaigns?.data || []).map(campaign => {
      const insights = campaign.insights?.data?.[0] || {};
      const actions = insights.actions as Array<{ action_type: string; value: string }> || [];
      const conversions = actions
        .filter(a => ['purchase', 'lead', 'complete_registration', 'contact'].includes(a.action_type))
        .reduce((sum, a) => sum + parseInt(a.value || '0'), 0);

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        impressions: parseInt(String(insights.impressions || 0)),
        clicks: parseInt(String(insights.clicks || 0)),
        spend: parseFloat(String(insights.spend || 0)),
        conversions,
      };
    });
  } catch (error) {
    console.error('[metaClient] Error fetching campaigns:', error);
    return [];
  }
}
