import { SupabaseClient } from '@supabase/supabase-js';

// Cache TTL in hours by data source and metric type
const CACHE_TTL: Record<string, Record<string, number>> = {
  ga4: {
    overview: 4,
    detailed: 4,
    pages: 4,
    sources: 4,
  },
  meta: {
    overview: 4,
    detailed: 4,
  },
  google_ads: {
    overview: 2,
    detailed: 2,
    campaigns: 2,
  },
  search_console: {
    overview: 6,
    detailed: 6,
    keywords: 6,
    keywords_previous: 6,
  },
};

function getTTL(dataSource: string, metricType: string): number {
  return CACHE_TTL[dataSource]?.[metricType] ?? 4; // Default 4 hours
}

export async function getCacheOrFetch<T>(
  supabase: SupabaseClient,
  siteId: string,
  dataSource: string,
  metricType: string,
  dateRange: string,
  fetchFn: () => Promise<T>,
  startDate?: string,
  endDate?: string
): Promise<T | null> {
  try {
    // Check cache first
    let query = supabase
      .from('analytics_cache')
      .select('data, expires_at, fetched_at')
      .eq('site_id', siteId)
      .eq('data_source', dataSource)
      .eq('metric_type', metricType)
      .eq('date_range', dateRange)
      .gt('expires_at', new Date().toISOString());

    if (startDate) {
      query = query.eq('start_date', startDate);
    }
    if (endDate) {
      query = query.eq('end_date', endDate);
    }

    const { data: cached, error: cacheError } = await query.maybeSingle();

    if (cached && !cacheError) {
      console.log(`[cacheManager] Cache hit for ${dataSource}/${metricType} (site: ${siteId})`);
      return cached.data as T;
    }

    // Fetch fresh data
    console.log(`[cacheManager] Cache miss for ${dataSource}/${metricType} (site: ${siteId}), fetching...`);
    const freshData = await fetchFn();

    if (freshData === null || freshData === undefined) {
      return null;
    }

    // Calculate TTL
    const ttlHours = getTTL(dataSource, metricType);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Store in cache
    const { error: upsertError } = await supabase
      .from('analytics_cache')
      .upsert({
        site_id: siteId,
        data_source: dataSource,
        metric_type: metricType,
        date_range: dateRange,
        start_date: startDate || null,
        end_date: endDate || null,
        data: freshData,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'site_id,data_source,metric_type,date_range,start_date,end_date'
      });

    if (upsertError) {
      console.error('[cacheManager] Failed to cache data:', upsertError);
    }

    return freshData;
  } catch (error) {
    console.error(`[cacheManager] Error for ${dataSource}/${metricType}:`, error);

    // Try to get stale cache as fallback
    const { data: staleCache } = await supabase
      .from('analytics_cache')
      .select('data')
      .eq('site_id', siteId)
      .eq('data_source', dataSource)
      .eq('metric_type', metricType)
      .eq('date_range', dateRange)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (staleCache) {
      console.log(`[cacheManager] Returning stale cache for ${dataSource}/${metricType}`);
      return staleCache.data as T;
    }

    return null;
  }
}

export async function clearCache(
  supabase: SupabaseClient,
  siteId?: string,
  dataSource?: string
): Promise<boolean> {
  try {
    let query = supabase.from('analytics_cache').delete();

    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    if (dataSource) {
      query = query.eq('data_source', dataSource);
    }

    // If no filters, delete expired entries only
    if (!siteId && !dataSource) {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const { error } = await query;

    if (error) {
      console.error('[cacheManager] Failed to clear cache:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[cacheManager] Error clearing cache:', error);
    return false;
  }
}

export function calculateDateRange(
  range: string,
  startDate?: string | null,
  endDate?: string | null,
  previousPeriod: boolean = false
): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (range === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
  } else {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;
    start = new Date(now);
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
  }

  // If previous period, shift both dates back by the same duration
  if (previousPeriod) {
    const duration = end.getTime() - start.getTime();
    end = new Date(start.getTime() - 1); // Day before start
    start = new Date(end.getTime() - duration);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
