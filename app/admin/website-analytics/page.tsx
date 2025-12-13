'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  LockClosedIcon,
  ChartBarIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
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

const ADMIN_CODE = '0457';

interface Site {
  id: string;
  slug: string;
  name: string;
  domain: string;
  isMainSite?: boolean;
  pageViews?: number;
  sessions?: number;
  adSpend?: number;
}

type TabType = 'overview' | 'traffic' | 'ads' | 'keywords';

export default function WebsiteAnalyticsPage() {
  const router = useRouter();

  // Auth state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard state
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>();
  const [customEndDate, setCustomEndDate] = useState<string>();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingSite, setLoadingSite] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>();

  // Admin code handlers
  const handleDigitPress = (digit: string) => {
    if (code.length < 4) {
      const newCode = code + digit;
      setCode(newCode);
      setAuthError('');

      if (newCode.length === 4) {
        if (newCode === ADMIN_CODE) {
          setIsUnlocked(true);
          setAuthError('');
        } else {
          setAuthError('Incorrect code');
          setCode('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setCode(code.slice(0, -1));
    setAuthError('');
  };

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

  // Code entry screen
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-bottom">
        <header className="shadow-sm safe-top" style={{ backgroundColor: '#06649b' }}>
          <div className="px-4 py-4 flex items-center">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6 text-white" />
            </button>
            <h1 className="text-lg font-bold text-white ml-2">Website Analytics</h1>
          </div>
        </header>

        <div className="flex flex-col items-center justify-center px-4 pt-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="bg-gray-100 p-4 rounded-full">
                <LockClosedIcon className="h-12 w-12 text-gray-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
              Enter Admin Code
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Enter the 4-digit code to access analytics
            </p>

            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors ${
                    code.length > i ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {authError && (
              <p className="text-red-500 text-sm text-center mb-4">{authError}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((digit, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (digit === '⌫') {
                      handleBackspace();
                    } else if (digit !== '') {
                      handleDigitPress(String(digit));
                    }
                  }}
                  disabled={digit === ''}
                  className={`h-14 rounded-xl text-xl font-semibold transition-colors ${
                    digit === ''
                      ? 'invisible'
                      : digit === '⌫'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {digit}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

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
            {/* Summary metrics */}
            <MetricCardGrid>
              <MetricCard
                title="Page Views"
                value={selectedSite ? (siteMetrics?.ga4?.pageViews || 0) : (overviewData?.totalPageViews || 0)}
                format="number"
                icon={EyeIcon}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Sessions"
                value={selectedSite ? (siteMetrics?.ga4?.sessions || 0) : (overviewData?.totalSessions || 0)}
                format="number"
                icon={UserGroupIcon}
                iconBgColor="bg-green-100"
                iconColor="text-green-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Users"
                value={selectedSite ? (siteMetrics?.ga4?.users || 0) : (overviewData?.totalUsers || 0)}
                format="number"
                icon={UserGroupIcon}
                iconBgColor="bg-purple-100"
                iconColor="text-purple-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Bounce Rate"
                value={selectedSite ? (siteMetrics?.ga4?.bounceRate || 0) : (overviewData?.avgBounceRate || 0)}
                format="percent"
                icon={ArrowTrendingUpIcon}
                iconBgColor="bg-yellow-100"
                iconColor="text-yellow-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Conversions"
                value={selectedSite ? (siteMetrics?.ga4?.conversions || 0) : (overviewData?.totalConversions || 0)}
                format="number"
                icon={ChartBarIcon}
                iconBgColor="bg-emerald-100"
                iconColor="text-emerald-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Ad Spend"
                value={selectedSite
                  ? ((siteMetrics?.googleAds?.spend || 0) + (siteMetrics?.meta?.spend || 0))
                  : (overviewData?.totalAdSpend || 0)}
                format="currency"
                icon={CurrencyDollarIcon}
                iconBgColor="bg-red-100"
                iconColor="text-red-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Ad Clicks"
                value={selectedSite
                  ? ((siteMetrics?.googleAds?.clicks || 0) + (siteMetrics?.meta?.clicks || 0))
                  : (overviewData?.totalAdClicks || 0)}
                format="number"
                icon={GlobeAltIcon}
                iconBgColor="bg-indigo-100"
                iconColor="text-indigo-600"
                loading={loadingOverview || loadingSite}
              />
              <MetricCard
                title="Avg CPC"
                value={overviewData?.avgCpc || 0}
                format="currency"
                icon={CurrencyDollarIcon}
                iconBgColor="bg-orange-100"
                iconColor="text-orange-600"
                loading={loadingOverview || loadingSite}
              />
            </MetricCardGrid>

            {/* Site breakdown (only when viewing all sites) */}
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
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Ad Spend</th>
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
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(site.adSpend || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
      </div>
    </main>
  );
}
