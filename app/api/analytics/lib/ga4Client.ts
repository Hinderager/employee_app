import { GA4Metrics, DailyMetric, PageMetric, TrafficSource } from '../../../admin/website-analytics/types/analytics';
import { calculateDateRange } from './cacheManager';

// Google Analytics Data API client
// Uses OAuth2 with refresh token (same credentials as Google Drive)
// Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN environment variables

interface GA4Response {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
}

async function getGA4Auth() {
  // Dynamic import to avoid issues if googleapis not installed
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

export async function getGA4OverviewData(
  propertyId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<Partial<GA4Metrics> | null> {
  if (!propertyId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.log('[ga4Client] Missing property ID or OAuth credentials');
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const auth = await getGA4Auth();
    const analyticsData = google.analyticsdata('v1beta');

    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    const response = await analyticsData.properties.runReport({
      auth,
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'conversions' },
        ],
      },
    });

    const row = response.data.rows?.[0];
    if (!row?.metricValues) {
      return null;
    }

    const values = row.metricValues.map(v => parseFloat(v.value || '0'));

    return {
      pageViews: Math.round(values[0]),
      sessions: Math.round(values[1]),
      users: Math.round(values[2]),
      newUsers: Math.round(values[3]),
      bounceRate: values[4] * 100, // Convert to percentage
      avgSessionDuration: values[5],
      conversions: Math.round(values[6]),
      conversionRate: values[1] > 0 ? (values[6] / values[1]) * 100 : 0,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ga4Client] Error fetching overview:', errorMessage);
    return null;
  }
}

export async function getGA4DetailedData(
  propertyId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<GA4Metrics | null> {
  if (!propertyId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const auth = await getGA4Auth();
    const analyticsData = google.analyticsdata('v1beta');

    const { start, end } = calculateDateRange(dateRange, startDate, endDate);

    // Fetch multiple reports in parallel
    const [overviewRes, pagesRes, sourcesRes, dailyRes] = await Promise.all([
      // Overview metrics
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
            { name: 'conversions' },
          ],
        },
      }),
      // Top pages
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
          limit: '10',
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        },
      }),
      // Traffic sources
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
          ],
          limit: '10',
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        },
      }),
      // Daily trend
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'conversions' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
        },
      }),
    ]);

    // Parse overview
    const overviewRow = overviewRes.data.rows?.[0];
    const overviewValues = overviewRow?.metricValues?.map(v => parseFloat(v.value || '0')) || [0, 0, 0, 0, 0, 0, 0];

    // Parse top pages
    const topPages: PageMetric[] = (pagesRes.data.rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '',
      pageTitle: row.dimensionValues?.[1]?.value || '',
      pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
      avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value || '0'),
    }));

    // Parse traffic sources
    const trafficSources: TrafficSource[] = (sourcesRes.data.rows || []).map(row => ({
      source: row.dimensionValues?.[0]?.value || '(direct)',
      medium: row.dimensionValues?.[1]?.value || '(none)',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues?.[2]?.value || '0') * 100,
    }));

    // Parse daily trend
    const dailyTrend: DailyMetric[] = (dailyRes.data.rows || []).map(row => ({
      date: row.dimensionValues?.[0]?.value || '',
      pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      users: parseInt(row.metricValues?.[2]?.value || '0'),
      conversions: parseInt(row.metricValues?.[3]?.value || '0'),
    }));

    return {
      pageViews: Math.round(overviewValues[0]),
      sessions: Math.round(overviewValues[1]),
      users: Math.round(overviewValues[2]),
      newUsers: Math.round(overviewValues[3]),
      bounceRate: overviewValues[4] * 100,
      avgSessionDuration: overviewValues[5],
      conversions: Math.round(overviewValues[6]),
      conversionRate: overviewValues[1] > 0 ? (overviewValues[6] / overviewValues[1]) * 100 : 0,
      topPages,
      trafficSources,
      dailyTrend,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ga4Client] Error fetching detailed data:', errorMessage);
    return null;
  }
}
