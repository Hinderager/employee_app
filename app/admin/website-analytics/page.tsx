'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline';

import MetricCard, { MetricCardGrid } from './components/MetricCard';
import SiteSelectorDropdown from './components/SiteSelectorDropdown';
import DateRangePicker from './components/DateRangePicker';
import RefreshButton from './components/RefreshButton';
import TrafficChart from './components/TrafficChart';
import SourcesPieChart from './components/SourcesPieChart';
import KeywordRankingsTable from './components/KeywordRankingsTable';
import CampaignTable from './components/CampaignTable';
import { DateRange, OverviewMetrics, SiteMetrics, AnalyticsSite } from './types/analytics';


interface Site {
  id: string;
  slug: string;
  name: string;
  domain: string;
  isMainSite?: boolean;
  pageViews?: number;
  sessions?: number;
  adSpend?: number;
  searchClicks?: number;
  searchImpressions?: number;
  avgPosition?: number;
  avgCtr?: number;
}

type TabType = 'overview' | 'traffic' | 'ads' | 'keywords' | 'location';
type TimeGranularity = 'daily' | 'weekly' | 'monthly';

export default function WebsiteAnalyticsPage() {
  const router = useRouter();

  // Auth state
  const isUnlocked = true; // No separate code needed - already entered on /admin page

  // Dashboard state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeGranularity, setTimeGranularity] = useState<TimeGranularity>('daily');

  // Data state
  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [siteMetrics, setSiteMetrics] = useState<SiteMetrics | null>(null);
  const [keywordsData, setKeywordsData] = useState<{ keywords: Array<{
    keyword: string;
    position: number;
    previousPosition?: number;
    positionChange?: number;
    impressions: number;
    clicks: number;
    ctr: number;
  }> } | null>(null);
  const [campaignsData, setCampaignsData] = useState<{ campaigns: Array<{
    source: 'google_ads' | 'meta';
    campaign: {
      id: string;
      name: string;
      status: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    };
  }> } | null>(null);

  // Helper function to aggregate daily data into weekly/monthly
  const aggregateTrafficData = useCallback((dailyData: Array<{ date: string; pageViews: number; sessions: number; users: number; conversions: number }>, granularity: TimeGranularity) => {
    if (!dailyData || dailyData.length === 0 || granularity === 'daily') {
      return dailyData;
    }

    const aggregated: Record<string, { date: string; pageViews: number; sessions: number; users: number; conversions: number }> = {};

    dailyData.forEach(day => {
      let key: string;
      const date = new Date(day.date + 'T00:00:00');

      if (granularity === 'weekly') {
        // Get the Monday of the week
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date);
        monday.setDate(diff);
        key = monday.toISOString().split('T')[0];
      } else {
        // Monthly - use first day of month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      }

      if (!aggregated[key]) {
        aggregated[key] = { date: key, pageViews: 0, sessions: 0, users: 0, conversions: 0 };
      }
      aggregated[key].pageViews += day.pageViews;
      aggregated[key].sessions += day.sessions;
      aggregated[key].users += day.users;
      aggregated[key].conversions += day.conversions;
    });

    return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>();



  // Date range handler
  const handleDateRangeChange = (range: DateRange, startDate?: string, endDate?: string) => {
    setDateRange(range);
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/analytics/overview?${params}`);
      const data = await response.json();

      if (data.success) {
        setOverviewData(data.data);
        setSites(data.sites || []);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setLoadingOverview(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch site-specific data
  const fetchSiteData = useCallback(async (siteId: string) => {
    setLoadingSite(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/analytics/${siteId}?${params}`);
      const data = await response.json();

      if (data.success) {
        setSiteMetrics(data.data);
        setLastUpdated(data.lastUpdated);
      }
    } catch (error) {
      console.error('Error fetching site data:', error);
    } finally {
      setLoadingSite(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch keywords
  const fetchKeywords = useCallback(async (siteId: string) => {
    setLoadingKeywords(true);
    try {
      const params = new URLSearchParams({ range: dateRange, limit: '20' });
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/analytics/keywords/${siteId}?${params}`);
      const data = await response.json();

      if (data.success) {
        setKeywordsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching keywords:', error);
    } finally {
      setLoadingKeywords(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async (siteId: string) => {
    setLoadingCampaigns(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (customStartDate) params.append('startDate', customStartDate);
      if (customEndDate) params.append('endDate', customEndDate);

      const response = await fetch(`/api/analytics/campaigns/${siteId}?${params}`);
      const data = await response.json();

      if (data.success) {
        setCampaignsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Refresh handler
  const handleRefresh = async () => {
    try {
      await fetch('/api/analytics/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite?.id,
        }),
      });

      // Reload data
      if (selectedSite) {
        await Promise.all([
          fetchSiteData(selectedSite.id),
          fetchKeywords(selectedSite.id),
          fetchCampaigns(selectedSite.id),
        ]);
      } else {
        await fetchOverview();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (isUnlocked) {
      fetchOverview();
    }
  }, [isUnlocked, fetchOverview]);

  // Load site-specific data when site selected
  useEffect(() => {
    if (isUnlocked && selectedSite) {
      fetchSiteData(selectedSite.id);
      fetchKeywords(selectedSite.id);
      fetchCampaigns(selectedSite.id);
    }
  }, [isUnlocked, selectedSite, fetchSiteData, fetchKeywords, fetchCampaigns]);

  // Reload data when date range changes
  useEffect(() => {
    if (isUnlocked) {
      if (selectedSite) {
        fetchSiteData(selectedSite.id);
        fetchKeywords(selectedSite.id);
        fetchCampaigns(selectedSite.id);
      } else {
        fetchOverview();
      }
    }
  }, [dateRange, customStartDate, customEndDate]);


  // Main dashboard
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom pb-8">
      {/* Header */}
      <header className="shadow-sm safe-top sticky top-0 z-40" style={{ backgroundColor: '#06649b' }}>
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white ml-2">Website Analytics</h1>
          </div>
          <RefreshButton onRefresh={handleRefresh} lastUpdated={lastUpdated} />
        </div>
      </header>

      {/* Filters */}
      <div className="px-4 py-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <SiteSelectorDropdown
          sites={sites}
          selectedSite={selectedSite}
          onSelectSite={setSelectedSite}
          loading={loadingOverview}
        />
        <DateRangePicker
          selectedRange={dateRange}
          onRangeChange={handleDateRangeChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
        />
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'overview' as TabType, label: 'Overview', icon: ChartBarIcon },
            { id: 'traffic' as TabType, label: 'Traffic', icon: EyeIcon },
            { id: 'ads' as TabType, label: 'Ads', icon: CurrencyDollarIcon },
            { id: 'keywords' as TabType, label: 'Keywords', icon: MagnifyingGlassIcon },
            { id: 'location' as TabType, label: 'Location', icon: MapPinIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Site breakdown */}
            {!selectedSite && sites.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900">Sites Overview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Site</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Page Views</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Sessions</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Search Clicks</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Avg Position</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sites.map((site) => (
                        <tr
                          key={site.id}
                          onClick={() => setSelectedSite(site)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-sm font-medium text-gray-900">{site.name}</span>
                              {site.isMainSite && (
                                <span className="ml-2 text-xs text-blue-600">(Main)</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{site.domain}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {new Intl.NumberFormat('en-US').format(site.pageViews || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {new Intl.NumberFormat('en-US').format(site.sessions || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {new Intl.NumberFormat('en-US').format(site.searchClicks || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {(site.avgPosition || 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {(site.avgCtr || 0).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comprehensive Site Dashboard when a site is selected */}
            {selectedSite && (
              <div className="space-y-6">
                {/* Site Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedSite.name}</h2>
                    <p className="text-sm text-gray-500">{selectedSite.domain}</p>
                  </div>
                  <button
                    onClick={() => setSelectedSite(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    ← All Sites
                  </button>
                </div>

                {/* Overview Metrics */}
                <MetricCardGrid>
                  <MetricCard
                    title="Users"
                    value={siteMetrics?.ga4?.users || 0}
                    format="number"
                    icon={UserGroupIcon}
                    iconBgColor="bg-blue-100"
                    iconColor="text-blue-600"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Sessions"
                    value={siteMetrics?.ga4?.sessions || 0}
                    format="number"
                    icon={EyeIcon}
                    iconBgColor="bg-green-100"
                    iconColor="text-green-600"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Page Views"
                    value={siteMetrics?.ga4?.pageViews || 0}
                    format="number"
                    icon={ChartBarIcon}
                    iconBgColor="bg-purple-100"
                    iconColor="text-purple-600"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Bounce Rate"
                    value={siteMetrics?.ga4?.bounceRate || 0}
                    format="percent"
                    icon={ClockIcon}
                    iconBgColor="bg-orange-100"
                    iconColor="text-orange-600"
                    loading={loadingSite}
                  />
                </MetricCardGrid>

                {/* Traffic Chart with Granularity Toggle */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Traffic Trend</h3>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                      {(['daily', 'weekly', 'monthly'] as TimeGranularity[]).map((granularity) => (
                        <button
                          key={granularity}
                          onClick={() => setTimeGranularity(granularity)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            timeGranularity === granularity
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {granularity.charAt(0).toUpperCase() + granularity.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <TrafficChart
                    data={aggregateTrafficData(siteMetrics?.ga4?.dailyTrend || [], timeGranularity)}
                    loading={loadingSite}
                    metrics={['pageViews', 'sessions', 'users']}
                    showTitle={false}
                  />
                </div>

                {/* Two Column Layout: Traffic Sources + Top Pages */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Traffic Sources */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900">Traffic Sources</h3>
                    </div>
                    {loadingSite ? (
                      <div className="p-4 animate-pulse space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-10 bg-gray-100 rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Source / Medium</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Sessions</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Users</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(siteMetrics?.ga4?.trafficSources || []).map((source, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {source.source} / {source.medium}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(source.sessions)}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(source.users)}
                                </td>
                              </tr>
                            ))}
                            {(!siteMetrics?.ga4?.trafficSources || siteMetrics.ga4.trafficSources.length === 0) && (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                  No traffic source data available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Top Pages */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900">Top Pages</h3>
                    </div>
                    {loadingSite ? (
                      <div className="p-4 animate-pulse space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-10 bg-gray-100 rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2 p-4">
                        {(siteMetrics?.ga4?.topPages || []).slice(0, 10).map((page, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{page.path}</p>
                              <p className="text-xs text-gray-500 truncate">{page.pageTitle}</p>
                            </div>
                            <div className="ml-4 text-sm font-medium text-gray-600">
                              {new Intl.NumberFormat('en-US').format(page.pageViews)}
                            </div>
                          </div>
                        ))}
                        {(!siteMetrics?.ga4?.topPages || siteMetrics.ga4.topPages.length === 0) && (
                          <p className="text-gray-500 text-center py-4">No page data available</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Device Breakdown</h3>
                  </div>
                  {loadingSite ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(siteMetrics?.ga4?.deviceData || []).map((device, index) => {
                        const DeviceIcon = device.device === 'desktop' ? ComputerDesktopIcon
                          : device.device === 'mobile' ? DevicePhoneMobileIcon
                          : DeviceTabletIcon;
                        const colorClass = device.device === 'desktop' ? 'bg-blue-500'
                          : device.device === 'mobile' ? 'bg-green-500'
                          : 'bg-purple-500';
                        return (
                          <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className={`p-2 rounded-lg ${colorClass.replace('500', '100')}`}>
                              <DeviceIcon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900 capitalize">{device.device}</span>
                                <span className="text-lg font-bold text-gray-900">{device.percentOfTotal.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${colorClass}`}
                                  style={{ width: `${Math.min(device.percentOfTotal, 100)}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>{new Intl.NumberFormat('en-US').format(device.sessions)} sessions</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(!siteMetrics?.ga4?.deviceData || siteMetrics.ga4.deviceData.length === 0) && (
                        <p className="text-gray-500 text-center py-4 col-span-3">No device data available</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Audience Location */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Audience Location</h3>
                  </div>
                  {loadingSite ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Country</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Users</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Sessions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">% of Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(siteMetrics?.ga4?.locationData || []).slice(0, 10).map((location, index) => {
                            const totalUsers = siteMetrics?.ga4?.users || 1;
                            const percentage = ((location.users / totalUsers) * 100).toFixed(1);
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{location.country}</td>
                                <td className="px-4 py-2 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(location.users)}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(location.sessions)}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-600">{percentage}%</td>
                              </tr>
                            );
                          })}
                          {(!siteMetrics?.ga4?.locationData || siteMetrics.ga4.locationData.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                No location data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Landing Pages Report */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Landing Pages</h3>
                    <p className="text-xs text-gray-500 mt-1">Pages where visitors enter your site</p>
                  </div>
                  {loadingSite ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Page</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Sessions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Users</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Bounce Rate</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Avg Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(siteMetrics?.ga4?.landingPages || []).slice(0, 20).map((page, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <div className="text-sm text-gray-900 truncate max-w-xs" title={page.path}>
                                  {page.path}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {new Intl.NumberFormat('en-US').format(page.sessions)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {new Intl.NumberFormat('en-US').format(page.users)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {page.bounceRate.toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {Math.floor(page.avgSessionDuration / 60)}:{String(Math.floor(page.avgSessionDuration % 60)).padStart(2, '0')}
                              </td>
                            </tr>
                          ))}
                          {(!siteMetrics?.ga4?.landingPages || siteMetrics.ga4.landingPages.length === 0) && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                No landing page data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* All Pages Report */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">All Pages</h3>
                    <p className="text-xs text-gray-500 mt-1">Page views for all pages regardless of entry point</p>
                  </div>
                  {loadingSite ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Page</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Title</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Page Views</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Avg Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(siteMetrics?.ga4?.allPages || []).slice(0, 30).map((page, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <div className="text-sm text-gray-900 truncate max-w-[200px]" title={page.path}>
                                  {page.path}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="text-sm text-gray-600 truncate max-w-[200px]" title={page.pageTitle}>
                                  {page.pageTitle || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                                {new Intl.NumberFormat('en-US').format(page.pageViews)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {Math.floor(page.avgTimeOnPage / 60)}:{String(Math.floor(page.avgTimeOnPage % 60)).padStart(2, '0')}
                              </td>
                            </tr>
                          ))}
                          {(!siteMetrics?.ga4?.allPages || siteMetrics.ga4.allPages.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                No page data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Search Console Report */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Search Console - Top Search Terms</h3>
                  </div>
                  {/* Search Console Metrics Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50/50 border-b border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Total Clicks</p>
                      <p className="text-xl font-bold text-gray-900">
                        {loadingSite ? '-' : new Intl.NumberFormat('en-US').format(siteMetrics?.searchConsole?.totalClicks || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Impressions</p>
                      <p className="text-xl font-bold text-gray-900">
                        {loadingSite ? '-' : new Intl.NumberFormat('en-US').format(siteMetrics?.searchConsole?.totalImpressions || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Average CTR</p>
                      <p className="text-xl font-bold text-gray-900">
                        {loadingSite ? '-' : `${(siteMetrics?.searchConsole?.avgCtr || 0).toFixed(2)}%`}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 uppercase">Avg Position</p>
                      <p className="text-xl font-bold text-gray-900">
                        {loadingSite ? '-' : (siteMetrics?.searchConsole?.avgPosition || 0).toFixed(1)}
                      </p>
                    </div>
                  </div>
                  {loadingKeywords ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Search Term</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Clicks</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Impressions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">CTR</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Position</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(keywordsData?.keywords || []).map((keyword, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">{keyword.keyword}</td>
                              <td className="px-4 py-2 text-right text-sm font-medium text-blue-600">
                                {new Intl.NumberFormat('en-US').format(keyword.clicks)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {new Intl.NumberFormat('en-US').format(keyword.impressions)}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-600">
                                {keyword.ctr.toFixed(2)}%
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className={`text-sm font-medium ${
                                  keyword.position <= 3 ? 'text-green-600' :
                                  keyword.position <= 10 ? 'text-yellow-600' : 'text-gray-600'
                                }`}>
                                  {keyword.position.toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!keywordsData?.keywords || keywordsData.keywords.length === 0) && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                No search term data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!selectedSite && sites.length === 0 && !loadingOverview && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sites Configured</h3>
                <p className="text-gray-500">Add sites to the analytics_sites table to get started.</p>
              </div>
            )}
          </>
        )}

        {/* Traffic Tab */}
        {activeTab === 'traffic' && selectedSite && (
          <div className="space-y-6">
            <TrafficChart
              data={siteMetrics?.ga4?.dailyTrend || []}
              loading={loadingSite}
              metrics={['pageViews', 'sessions', 'users']}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourcesPieChart
                data={siteMetrics?.ga4?.trafficSources || []}
                loading={loadingSite}
                metric="sessions"
              />
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Pages</h3>
                {loadingSite ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(siteMetrics?.ga4?.topPages || []).slice(0, 10).map((page, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{page.path}</p>
                          <p className="text-xs text-gray-500 truncate">{page.pageTitle}</p>
                        </div>
                        <div className="ml-4 text-sm font-medium text-gray-600">
                          {new Intl.NumberFormat('en-US').format(page.pageViews)}
                        </div>
                      </div>
                    ))}
                    {(!siteMetrics?.ga4?.topPages || siteMetrics.ga4.topPages.length === 0) && (
                      <p className="text-gray-500 text-center py-4">No page data available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'traffic' && !selectedSite && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Site</h3>
            <p className="text-gray-500">Choose a specific site to view traffic details</p>
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <>
            {selectedSite ? (
              <div className="space-y-6">
                <MetricCardGrid>
                  <MetricCard
                    title="Total Spend"
                    value={(siteMetrics?.googleAds?.spend || 0) + (siteMetrics?.meta?.spend || 0)}
                    format="currency"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Total Clicks"
                    value={(siteMetrics?.googleAds?.clicks || 0) + (siteMetrics?.meta?.clicks || 0)}
                    format="number"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Conversions"
                    value={(siteMetrics?.googleAds?.conversions || 0) + (siteMetrics?.meta?.conversions || 0)}
                    format="number"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="ROAS"
                    value={siteMetrics?.googleAds?.roas || 0}
                    format="decimal"
                    subtitle="x"
                    loading={loadingSite}
                  />
                </MetricCardGrid>
                <CampaignTable
                  campaigns={campaignsData?.campaigns || []}
                  loading={loadingCampaigns}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <MetricCardGrid>
                  <MetricCard
                    title="Total Ad Spend"
                    value={overviewData?.totalAdSpend || 0}
                    format="currency"
                    loading={loadingOverview}
                  />
                  <MetricCard
                    title="Total Clicks"
                    value={overviewData?.totalAdClicks || 0}
                    format="number"
                    loading={loadingOverview}
                  />
                  <MetricCard
                    title="Total Impressions"
                    value={overviewData?.totalAdImpressions || 0}
                    format="number"
                    loading={loadingOverview}
                  />
                  <MetricCard
                    title="Avg ROAS"
                    value={overviewData?.avgRoas || 0}
                    format="decimal"
                    loading={loadingOverview}
                  />
                </MetricCardGrid>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Site</h3>
                  <p className="text-gray-500">Choose a specific site to view campaign details</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Keywords Tab */}
        {activeTab === 'keywords' && (
          <>
            {selectedSite ? (
              <div className="space-y-6">
                <MetricCardGrid>
                  <MetricCard
                    title="Total Impressions"
                    value={siteMetrics?.searchConsole?.totalImpressions || 0}
                    format="number"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Total Clicks"
                    value={siteMetrics?.searchConsole?.totalClicks || 0}
                    format="number"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Average CTR"
                    value={siteMetrics?.searchConsole?.avgCtr || 0}
                    format="percent"
                    loading={loadingSite}
                  />
                  <MetricCard
                    title="Average Position"
                    value={siteMetrics?.searchConsole?.avgPosition || 0}
                    format="decimal"
                    loading={loadingSite}
                  />
                </MetricCardGrid>
                <KeywordRankingsTable
                  keywords={keywordsData?.keywords || []}
                  loading={loadingKeywords}
                  maxRows={20}
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Site</h3>
                <p className="text-gray-500">Choose a specific site to view keyword rankings</p>
              </div>
            )}
          </>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <>
            {selectedSite ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900">Visitors by Country</h3>
                  </div>
                  {loadingSite ? (
                    <div className="p-4 animate-pulse space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Country</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Users</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Sessions</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">% of Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(siteMetrics?.ga4?.locationData || []).map((location, index) => {
                            const totalUsers = siteMetrics?.ga4?.users || 1;
                            const percentage = ((location.users / totalUsers) * 100).toFixed(1);
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{location.country}</td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(location.users)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">
                                  {new Intl.NumberFormat('en-US').format(location.sessions)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">{percentage}%</td>
                              </tr>
                            );
                          })}
                          {(!siteMetrics?.ga4?.locationData || siteMetrics.ga4.locationData.length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                No location data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Site</h3>
                <p className="text-gray-500">Choose a specific site to view visitor locations</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
