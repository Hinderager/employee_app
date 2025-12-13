import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCacheOrFetch } from '../../lib/cacheManager';
import { getSearchConsoleKeywords } from '../../lib/searchConsoleClient';
import { KeywordRanking } from '../../../../admin/website-analytics/types/analytics';

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
    const limit = parseInt(searchParams.get('limit') || '20');
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

    if (!site.search_console_property) {
      return NextResponse.json({
        success: true,
        data: {
          keywords: [],
          message: 'Search Console not configured for this site',
        },
        site: {
          id: site.id,
          name: site.display_name,
        },
        dateRange: { range: dateRange, startDate, endDate },
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fetch current period keywords
    const keywords = await getCacheOrFetch<KeywordRanking[]>(
      supabase,
      site.id,
      'search_console',
      'keywords',
      dateRange,
      () => getSearchConsoleKeywords(site.search_console_property, dateRange, limit, false, startDate, endDate),
      startDate,
      endDate
    ) || [];

    // Fetch previous period for comparison
    const previousKeywords = await getCacheOrFetch<KeywordRanking[]>(
      supabase,
      site.id,
      'search_console',
      'keywords_previous',
      dateRange,
      () => getSearchConsoleKeywords(site.search_console_property, dateRange, limit, true, startDate, endDate),
      startDate,
      endDate
    ) || [];

    // Create lookup map for previous positions
    const previousMap = new Map(previousKeywords.map(kw => [kw.keyword, kw.position]));

    // Calculate position changes
    const keywordsWithChanges: KeywordRanking[] = keywords.map(kw => {
      const previousPosition = previousMap.get(kw.keyword);
      const positionChange = previousPosition !== undefined
        ? previousPosition - kw.position // Positive = improved, negative = declined
        : undefined;

      return {
        ...kw,
        previousPosition,
        positionChange,
      };
    });

    // Store in history for trend tracking
    await storeKeywordHistory(supabase, site.id, keywordsWithChanges);

    return NextResponse.json({
      success: true,
      data: {
        keywords: keywordsWithChanges,
        totalKeywords: keywordsWithChanges.length,
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
    console.error('[analytics/keywords] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function storeKeywordHistory(
  supabase: any,
  siteId: string,
  keywords: KeywordRanking[]
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Only store top 20 keywords
    const topKeywords = keywords.slice(0, 20);

    for (const kw of topKeywords) {
      await supabase
        .from('keyword_rankings_history')
        .upsert({
          site_id: siteId,
          keyword: kw.keyword,
          position: kw.position,
          impressions: kw.impressions,
          clicks: kw.clicks,
          ctr: kw.ctr,
          recorded_date: today,
        }, {
          onConflict: 'site_id,keyword,recorded_date',
        });
    }
  } catch (error) {
    console.error('[analytics/keywords] Error storing history:', error);
    // Don't fail the request if history storage fails
  }
}
