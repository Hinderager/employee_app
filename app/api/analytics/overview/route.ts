import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCacheOrFetch } from '../lib/cacheManager';
import { getGA4OverviewData } from '../lib/ga4Client';
import { getMetaOverviewData } from '../lib/metaClient';
import { getGoogleAdsOverviewData } from '../lib/googleAdsClient';
import { OverviewMetrics, AnalyticsSite } from '../../../admin/website-analytics/types/analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.EMPLOYEE_APP_SUPABASE_URL!,
    process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || '30d';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const supabase = getSupabase();

    // Fetch all active sites
    const { data: sites, error: sitesError } = await supabase
      .from('analytics_sites')
      .select('*')
      .eq('is_active', true)
      .order('is_main_site', { ascending: false })
      .order('display_name', { ascending: true });

    if (sitesError) {
      console.error('[analytics/overview] Error fetching sites:', sitesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sites' },
        { status: 500 }
      );
    }

    // Initialize aggregated metrics
    const aggregated: OverviewMetrics = {
      totalPageViews: 0,
      totalSessions: 0,
      totalUsers: 0,
      avgBounceRate: 0,
      totalConversions: 0,
      totalAdSpend: 0,
      totalAdClicks: 0,
      totalAdImpressions: 0,
      avgCpc: 0,
      avgRoas: 0,
      siteCount: sites?.length || 0,
    };

    const bounceRates: number[] = [];
    const roasValues: number[] = [];
    const siteMetrics: Array<{
      site: AnalyticsSite;
      ga4: Partial<{
        pageViews: number;
        sessions: number;
        users: number;
        bounceRate: number;
        conversions: number;
      }> | null;
      googleAds: Partial<{
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
        roas: number;
      }> | null;
      meta: Partial<{
        spend: number;
        clicks: number;
        impressions: number;
        conversions: number;
      }> | null;
    }> = [];

    // Fetch data for each site in parallel
    const sitePromises = (sites || []).map(async (site: AnalyticsSite) => {
      const [ga4Data, googleAdsData, metaData] = await Promise.all([
        // GA4 data
        site.ga4_property_id
          ? getCacheOrFetch(
              supabase,
              site.id,
              'ga4',
              'overview',
              dateRange,
              () => getGA4OverviewData(site.ga4_property_id!, dateRange, startDate, endDate),
              startDate,
              endDate
            )
          : null,
        // Google Ads data
        site.google_ads_customer_id
          ? getCacheOrFetch(
              supabase,
              site.id,
              'google_ads',
              'overview',
              dateRange,
              () => getGoogleAdsOverviewData(site.google_ads_customer_id!, dateRange, startDate, endDate),
              startDate,
              endDate
            )
          : null,
        // Meta data
        site.meta_pixel_id
          ? getCacheOrFetch(
              supabase,
              site.id,
              'meta',
              'overview',
              dateRange,
              () => getMetaOverviewData(site.meta_pixel_id!, dateRange, startDate, endDate),
              startDate,
              endDate
            )
          : null,
      ]);

      return { site, ga4: ga4Data, googleAds: googleAdsData, meta: metaData };
    });

    const results = await Promise.all(sitePromises);

    // Aggregate results
    for (const result of results) {
      siteMetrics.push(result);

      if (result.ga4) {
        aggregated.totalPageViews += result.ga4.pageViews || 0;
        aggregated.totalSessions += result.ga4.sessions || 0;
        aggregated.totalUsers += result.ga4.users || 0;
        aggregated.totalConversions += result.ga4.conversions || 0;
        if (result.ga4.bounceRate) {
          bounceRates.push(result.ga4.bounceRate);
        }
      }

      if (result.googleAds) {
        aggregated.totalAdSpend += result.googleAds.spend || 0;
        aggregated.totalAdClicks += result.googleAds.clicks || 0;
        aggregated.totalAdImpressions += result.googleAds.impressions || 0;
        if (result.googleAds.roas) {
          roasValues.push(result.googleAds.roas);
        }
      }

      if (result.meta) {
        aggregated.totalAdSpend += result.meta.spend || 0;
        aggregated.totalAdClicks += result.meta.clicks || 0;
        aggregated.totalAdImpressions += result.meta.impressions || 0;
      }
    }

    // Calculate averages
    aggregated.avgBounceRate = bounceRates.length > 0
      ? bounceRates.reduce((a, b) => a + b, 0) / bounceRates.length
      : 0;
    aggregated.avgRoas = roasValues.length > 0
      ? roasValues.reduce((a, b) => a + b, 0) / roasValues.length
      : 0;
    aggregated.avgCpc = aggregated.totalAdClicks > 0
      ? aggregated.totalAdSpend / aggregated.totalAdClicks
      : 0;

    return NextResponse.json({
      success: true,
      data: aggregated,
      sites: siteMetrics.map(sm => ({
        id: sm.site.id,
        slug: sm.site.slug,
        name: sm.site.display_name,
        domain: sm.site.domain,
        isMainSite: sm.site.is_main_site,
        pageViews: sm.ga4?.pageViews || 0,
        sessions: sm.ga4?.sessions || 0,
        adSpend: (sm.googleAds?.spend || 0) + (sm.meta?.spend || 0),
      })),
      dateRange: { range: dateRange, startDate, endDate },
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[analytics/overview] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
