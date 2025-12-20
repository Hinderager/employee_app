import { GA4Metrics, DailyMetric, PageMetric, TrafficSource, LocationData, LandingPageMetric, DeviceData, PageTitleMetric } from '../../../admin/website-analytics/types/analytics';
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

// Helper to build hostname filter for GA4 queries
function buildHostnameFilter(hostname?: string) {
  if (!hostname) return undefined;
  // Extract domain name without www. prefix for matching
  const domainMatch = hostname.replace(/^www\./, '');
  return {
    filter: {
      fieldName: 'hostName',
      stringFilter: {
        matchType: 'CONTAINS' as const,
        value: domainMatch,
      },
    },
  };
}

export async function getGA4OverviewData(
  propertyId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string,
  hostname?: string
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
    const dimensionFilter = buildHostnameFilter(hostname);

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
        dimensionFilter,
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
  endDate?: string,
  hostname?: string
): Promise<GA4Metrics | null> {
  if (!propertyId || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return null;
  }

  try {
    const { google } = await import('googleapis');
    const auth = await getGA4Auth();
    const analyticsData = google.analyticsdata('v1beta');

    const { start, end } = calculateDateRange(dateRange, startDate, endDate);
    const dimensionFilter = buildHostnameFilter(hostname);

    // Fetch multiple reports in parallel
    const [overviewRes, pagesRes, sourcesRes, dailyRes, locationRes, landingPagesRes, allPagesRes, deviceRes] = await Promise.all([
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
          dimensionFilter,
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
          dimensionFilter,
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
          dimensionFilter,
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
          dimensionFilter,
        },
      }),
      // Location data (users by country)
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'country' }],
          metrics: [
            { name: 'totalUsers' },
            { name: 'sessions' },
          ],
          limit: '20',
          orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
          dimensionFilter,
        },
      }),
      // Landing pages (entry pages)
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'landingPage' }, { name: 'landingPagePlusQueryString' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
          limit: '50',
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          dimensionFilter,
        },
      }),
      // All pages (pageviews for every page)
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
          limit: '100',
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          dimensionFilter,
        },
      }),
      // Device breakdown
      analyticsData.properties.runReport({
        auth,
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          dimensionFilter,
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

    // Parse daily trend - GA4 returns dates in YYYYMMDD format, convert to YYYY-MM-DD
    const dailyTrend: DailyMetric[] = (dailyRes.data.rows || []).map(row => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      // Convert YYYYMMDD to YYYY-MM-DD format for proper Date parsing
      const formattedDate = rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;
      return {
        date: formattedDate,
        pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
        sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        users: parseInt(row.metricValues?.[2]?.value || '0'),
        conversions: parseInt(row.metricValues?.[3]?.value || '0'),
      };
    });

    // Parse location data
    const locationData: LocationData[] = (locationRes.data.rows || []).map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
    }));

    // Parse landing pages
    const landingPages: LandingPageMetric[] = (landingPagesRes.data.rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '',
      pageTitle: row.dimensionValues?.[1]?.value || row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues?.[2]?.value || '0') * 100,
      avgSessionDuration: parseFloat(row.metricValues?.[3]?.value || '0'),
    }));

    // Parse all pages (pageviews for every page)
    const allPages: PageMetric[] = (allPagesRes.data.rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '',
      pageTitle: row.dimensionValues?.[1]?.value || '',
      pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
      avgTimeOnPage: parseFloat(row.metricValues?.[1]?.value || '0'),
    }));

    // Parse device data
    const totalDeviceSessions = (deviceRes.data.rows || []).reduce(
      (sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'),
      0
    );
    const deviceData: DeviceData[] = (deviceRes.data.rows || []).map(row => {
      const sessions = parseInt(row.metricValues?.[0]?.value || '0');
      return {
        device: row.dimensionValues?.[0]?.value || 'unknown',
        sessions,
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || '0') * 100,
        percentOfTotal: totalDeviceSessions > 0 ? (sessions / totalDeviceSessions) * 100 : 0,
      };
    });

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
      locationData,
      landingPages,
      allPages,
      deviceData,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ga4Client] Error fetching detailed data:', errorMessage);
    return null;
  }
}

/**
 * Get page title breakdown across all sites (no hostname filter)
 * This shows views distributed by page title, which typically represents different microsites
 */
export async function getGA4PageTitleBreakdown(
  propertyId: string,
  dateRange: string,
  startDate?: string,
  endDate?: string
): Promise<PageTitleMetric[] | null> {
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
        dimensions: [{ name: 'pageTitle' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'eventCount' },
          { name: 'conversions' },
        ],
        limit: '50',
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      },
    });

    const pageTitles: PageTitleMetric[] = (response.data.rows || []).map(row => {
      const views = parseInt(row.metricValues?.[0]?.value || '0');
      const activeUsers = parseInt(row.metricValues?.[1]?.value || '0');
      return {
        pageTitle: row.dimensionValues?.[0]?.value || 'Unknown',
        views,
        activeUsers,
        viewsPerUser: activeUsers > 0 ? views / activeUsers : 0,
        avgEngagementTime: parseFloat(row.metricValues?.[2]?.value || '0'),
        eventCount: parseInt(row.metricValues?.[3]?.value || '0'),
        conversions: parseInt(row.metricValues?.[4]?.value || '0'),
      };
    });

    return pageTitles;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ga4Client] Error fetching page title breakdown:', errorMessage);
    return null;
  }
}
