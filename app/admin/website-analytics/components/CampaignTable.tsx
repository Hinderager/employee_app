'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CampaignMetric } from '../types/analytics';

interface Campaign {
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
}

interface CampaignTableProps {
  campaigns: Campaign[];
  loading?: boolean;
  onCampaignClick?: (campaignId: string, source: string) => void;
}

export default function CampaignTable({
  campaigns,
  loading = false,
  onCampaignClick,
}: CampaignTableProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const toggleExpand = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const getSourceBadge = (source: 'google_ads' | 'meta') => {
    if (source === 'google_ads') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          Google Ads
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
        Meta
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'enabled' || normalizedStatus === 'active') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      );
    }
    if (normalizedStatus === 'paused') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Paused
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        {status}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">
          Ad Campaigns ({campaigns.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Source
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Spend
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                Clicks
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                CTR
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                Conv.
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                CPC
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No campaigns found
                </td>
              </tr>
            ) : (
              campaigns.map((item, index) => {
                const { source, campaign } = item;
                const campaignId = campaign.id || `campaign-${index}`;
                const isExpanded = expandedCampaigns.has(campaignId);
                const hasKeywords = 'topKeywords' in campaign && campaign.topKeywords?.length > 0;
                const ctr = campaign.impressions > 0
                  ? (campaign.clicks / campaign.impressions) * 100
                  : 0;
                const cpc = campaign.clicks > 0
                  ? campaign.spend / campaign.clicks
                  : 0;

                return (
                  <>
                    <tr
                      key={campaignId}
                      className={`hover:bg-gray-50 ${hasKeywords ? 'cursor-pointer' : ''}`}
                      onClick={() => hasKeywords && toggleExpand(campaignId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasKeywords && (
                            isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                            )
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {campaign.name || 'Unnamed Campaign'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getSourceBadge(source)}</td>
                      <td className="px-4 py-3">{getStatusBadge(campaign.status)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(campaign.spend)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatNumber(campaign.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {ctr.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatNumber(campaign.conversions)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {formatCurrency(cpc)}
                      </td>
                    </tr>
                    {/* Expanded keywords section */}
                    {isExpanded && hasKeywords && 'topKeywords' in campaign && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-8 py-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                            Top Keywords
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {campaign.topKeywords.slice(0, 6).map((kw, kwIndex) => (
                              <div
                                key={kwIndex}
                                className="bg-white rounded-lg px-3 py-2 border border-gray-200"
                              >
                                <div className="text-sm text-gray-900 truncate">
                                  {kw.keyword}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatNumber(kw.clicks)} clicks | {formatCurrency(kw.cpc)} CPC
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
