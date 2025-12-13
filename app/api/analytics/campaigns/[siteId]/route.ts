import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCacheOrFetch } from '../../lib/cacheManager';
import { getGoogleAdsDetailedData, getGoogleAdsCampaignKeywords } from '../../lib/googleAdsClient';
import { getMetaCampaigns } from '../../lib/metaClient';
import { CampaignMetric, GoogleAdsMetrics } from '../../../../admin/website-analytics/types/analytics';

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
    const source = searchParams.get('source') || 'all'; // 'google_ads', 'meta', or 'all'
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const supabase = getSupabase();

    // Fetch site configuration
    let site;
    const { data: siteById } = await supabase
      .from('analytics_sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteById) {
      site = siteById;
    } else {
      const { data: siteBySlug } = await supabase
        .from('analytics_sites')
        .select('*')
        .eq('slug', siteId)
        .single();
      site = siteBySlug;
    }

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    const campaigns: Array<{
      source: 'google_ads' | 'meta';
      campaign: CampaignMetric | {
        id: string;
        name: string;
        status: string;
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
      };
    }> = [];

    // Fetch Google Ads campaigns
    if ((source === 'all' || source === 'google_ads') && site.google_ads_customer_id) {
      const googleAdsData = await getCacheOrFetch<GoogleAdsMetrics | null>(
        supabase,
        site.id,
        'google_ads',
        'campaigns',
        dateRange,
        () => getGoogleAdsDetailedData(site.google_ads_customer_id, dateRange, startDate, endDate),
        startDate,
        endDate
      );

      if (googleAdsData?.campaigns) {
        for (const campaign of googleAdsData.campaigns) {
          campaigns.push({
            source: 'google_ads',
            campaign,
          });
        }
      }
    }

    // Fetch Meta campaigns
    if ((source === 'all' || source === 'meta') && site.meta_pixel_id) {
      const metaCampaigns = await getCacheOrFetch(
        supabase,
        site.id,
        'meta',
        'campaigns',
        dateRange,
        () => getMetaCampaigns(dateRange, startDate, endDate),
        startDate,
        endDate
      );

      if (metaCampaigns) {
        for (const campaign of metaCampaigns as Array<{
          id: string;
          name: string;
          status: string;
          impressions: number;
          clicks: number;
          spend: number;
          conversions: number;
        }>) {
          campaigns.push({
            source: 'meta',
            campaign,
          });
        }
      }
    }

    // Sort campaigns by spend (descending)
    campaigns.sort((a, b) => (b.campaign.spend || 0) - (a.campaign.spend || 0));

    // Calculate totals
    const totals = {
      totalSpend: campaigns.reduce((sum, c) => sum + (c.campaign.spend || 0), 0),
      totalClicks: campaigns.reduce((sum, c) => sum + (c.campaign.clicks || 0), 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + (c.campaign.impressions || 0), 0),
      totalConversions: campaigns.reduce((sum, c) => sum + (c.campaign.conversions || 0), 0),
      campaignCount: campaigns.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        totals,
        hasGoogleAds: !!site.google_ads_customer_id,
        hasMeta: !!site.meta_pixel_id,
      },
      site: {
        id: site.id,
        name: site.display_name,
        domain: site.domain,
      },
      dateRange: { range: dateRange, startDate, endDate },
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error) {
    console.error('[analytics/campaigns] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get keywords for a specific campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const body = await request.json();
    const { campaignId, source, dateRange = '30d', startDate, endDate } = body;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fetch site
    let site;
    const { data: siteById } = await supabase
      .from('analytics_sites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (siteById) {
      site = siteById;
    } else {
      const { data: siteBySlug } = await supabase
        .from('analytics_sites')
        .select('*')
        .eq('slug', siteId)
        .single();
      site = siteBySlug;
    }

    if (!site) {
      return NextResponse.json(
        { success: false, error: 'Site not found' },
        { status: 404 }
      );
    }

    let keywords: Array<{
      keyword: string;
      impressions: number;
      clicks: number;
      cpc: number;
      conversions: number;
      qualityScore?: number;
    }> = [];

    if (source === 'google_ads' && site.google_ads_customer_id) {
      keywords = await getGoogleAdsCampaignKeywords(
        site.google_ads_customer_id,
        campaignId,
        dateRange,
        startDate,
        endDate
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        campaignId,
        keywords,
      },
      dateRange: { range: dateRange, startDate, endDate },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[analytics/campaigns] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
