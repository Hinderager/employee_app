import { KeywordRanking, SearchConsoleMetrics } from '../../../admin/website-analytics/types/analytics';
import { calculateDateRange } from './cacheManager';

// Google Search Console API client
// Uses OAuth2 with refresh token (same as GA4 and Google Drive)

async function getSearchConsoleAuth() {
  const { google } = await import('googleapis');

  // Use OAuth2 with refresh token (same as Google Drive setup)
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

export async function getSearchConsoleOverview(
  siteUrl: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Partial<SearchConsoleMetrics> | null> {
  if (!siteUrl || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('[searchConsoleClient] Missing site URL or OAuth credentials');
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
  if (!siteUrl || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
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
  if (!siteUrl || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
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
