import { KeywordRanking, SearchConsoleMetrics } from '../../../admin/website-analytics/types/analytics';
import { calculateDateRange } from './cacheManager';

// Google Search Console API client
// Uses same service account as GA4

async function getSearchConsoleAuth() {
  const { google } = await import('googleapis');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GA4_SERVICE_ACCOUNT_EMAIL, // Same as GA4
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return auth;
}

export async function getSearchConsoleOverview(
  siteUrl: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Partial<SearchConsoleMetrics> | null> {
  if (!siteUrl || !process.env.GA4_SERVICE_ACCOUNT_EMAIL) {
    console.log('[searchConsoleClient] Missing site URL or credentials');
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const auth = await getSearchConsoleAuth();
    const searchConsole = google.searchconsole('v1');

    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    // Ensure siteUrl is properly formatted
    const formattedSiteUrl = siteUrl.startsWith('sc-domain:') || siteUrl.startsWith('http')
      ? siteUrl
      : `sc-domain:${siteUrl}`;

    const response = await searchConsole.searchanalytics.query({
      auth,
      siteUrl: formattedSiteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: [],
        dataState: 'final',
      },
    });

    const row = response.data.rows?.[0];

    return {
      totalImpressions: row?.impressions || 0,
      totalClicks: row?.clicks || 0,
      avgCtr: (row?.ctr || 0) * 100,
      avgPosition: row?.position || 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[searchConsoleClient] Error fetching overview:', errorMessage);
    return null;
  }
}

export async function getSearchConsoleKeywords(
  siteUrl: string,
  dateRange: string,
  limit: number = 20,
  previousPeriod: boolean = false,
  startDate?: string,
  endDate?: string
): Promise<KeywordRanking[]> {
  if (!siteUrl || !process.env.GA4_SERVICE_ACCOUNT_EMAIL) {
    return [];
  }

  try {
    const { google } = await import('googleapis');
    const auth = await getSearchConsoleAuth();
    const searchConsole = google.searchconsole('v1');

    const { start, end } = calculateDateRange(dateRange, startDate, endDate, previousPeriod);

    const formattedSiteUrl = siteUrl.startsWith('sc-domain:') || siteUrl.startsWith('http')
      ? siteUrl
      : `sc-domain:${siteUrl}`;

    const response = await searchConsole.searchanalytics.query({
      auth,
      siteUrl: formattedSiteUrl,
      requestBody: {
        startDate: start,
        endDate: end,
        dimensions: ['query'],
        rowLimit: limit,
        dataState: 'final',
      },
    });

    return (response.data.rows || []).map(row => ({
      keyword: row.keys?.[0] || '',
      position: row.position || 0,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      ctr: (row.ctr || 0) * 100,
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[searchConsoleClient] Error fetching keywords:', errorMessage);
    return [];
  }
}

export async function getSearchConsoleDetailedData(
  siteUrl: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<SearchConsoleMetrics | null> {
  if (!siteUrl || !process.env.GA4_SERVICE_ACCOUNT_EMAIL) {
    return null;
  }

  try {
    // Fetch overview and keywords in parallel
    const [overview, keywords] = await Promise.all([
      getSearchConsoleOverview(siteUrl, dateRange, startDate, endDate),
      getSearchConsoleKeywords(siteUrl, dateRange, 20, false, startDate, endDate),
    ]);

    if (!overview) {
      return null;
    }

    return {
      totalImpressions: overview.totalImpressions || 0,
      totalClicks: overview.totalClicks || 0,
      avgCtr: overview.avgCtr || 0,
      avgPosition: overview.avgPosition || 0,
      topKeywords: keywords,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[searchConsoleClient] Error fetching detailed data:', errorMessage);
    return null;
  }
}
