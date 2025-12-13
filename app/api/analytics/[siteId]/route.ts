import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCacheOrFetch } from '../lib/cacheManager';
import { getGA4DetailedData } from '../lib/ga4Client';
import { getMetaDetailedData } from '../lib/metaClient';
import { getGoogleAdsDetailedData } from '../lib/googleAdsClient';
import { getSearchConsoleDetailedData } from '../lib/searchConsoleClient';
import { SiteMetrics } from '../../../admin/website-analytics/types/analytics';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  return createClient(
    process.env.EMPLOYEE_APP_SUPABASE_URL!,
    process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || '30d';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const supabase = getSupabase();

    // Fetch site configuration
    const { data: site, error: siteError } = await supabase
      .from('analytics_sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      // Try finding by slug
      const { data: siteBySlug, error: slugError } = await supabase
        .from('analytics_sites')
        .select('*')
        .eq('slug', siteId)
        .single();

      if (slugError || !siteBySlug) {
        return NextResponse.json(
          { success: false, error: 'Site not found' },
          { status: 404 }
        );
      }

      Object.assign(site || {}, siteBySlug);
    }

    // Fetch data from all sources in parallel
    const [ga4Data, metaData, googleAdsData, searchConsoleData] = await Promise.all([
      // GA4 detailed data
      site.ga4_property_id
        ? getCacheOrFetch(
            supabase,
            site.id,
            'ga4',
            'detailed',
            dateRange,
            () => getGA4DetailedData(site.ga4_property_id, dateRange, startDate, endDate),
            startDate,
            endDate
          )
        : null,
      // Meta detailed data
      site.meta_pixel_id
        ? getCacheOrFetch(
            supabase,
            site.id,
            'meta',
            'detailed',
            dateRange,
            () => getMetaDetailedData(site.meta_pixel_id, dateRange, startDate, endDate),
            startDate,
            endDate
          )
        : null,
      // Google Ads detailed data
      site.google_ads_customer_id
        ? getCacheOrFetch(
            supabase,
            site.id,
            'google_ads',
            'detailed',
            dateRange,
            () => getGoogleAdsDetailedData(site.google_ads_customer_id, dateRange, startDate, endDate),
            startDate,
            endDate
          )
        : null,
      // Search Console detailed data
      site.search_console_property
        ? getCacheOrFetch(
            supabase,
            site.id,
            'search_console',
            'detailed',
            dateRange,
            () => getSearchConsoleDetailedData(site.search_console_property, dateRange, startDate, endDate),
            startDate,
            endDate
          )
        : null,
    ]);

    const siteMetrics: SiteMetrics = {
      siteId: site.id,
      siteName: site.display_name,
      domain: site.domain,
      ga4: ga4Data,
      meta: metaData,
      googleAds: googleAdsData,
      searchConsole: searchConsoleData,
      dateRange: { range: dateRange as '7d' | '30d' | '90d' | 'custom', startDate, endDate },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: siteMetrics,
      site: {
        id: site.id,
        slug: site.slug,
        name: site.display_name,
        domain: site.domain,
        isMainSite: site.is_main_site,
        hasGa4: !!site.ga4_property_id,
        hasMeta: !!site.meta_pixel_id,
        hasGoogleAds: !!site.google_ads_customer_id,
        hasSearchConsole: !!site.search_console_property,
      },
      dateRange: { range: dateRange, startDate, endDate },
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[analytics/siteId] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
