'use client';

import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { KeywordRanking } from '../types/analytics';

interface KeywordRankingsTableProps {
  keywords: KeywordRanking[];
  loading?: boolean;
  showSearch?: boolean;
  maxRows?: number;
}

export default function KeywordRankingsTable({
  keywords,
  loading = false,
  showSearch = true,
  maxRows = 20,
}: KeywordRankingsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof KeywordRanking>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof KeywordRanking) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'position' ? 'asc' : 'desc');
    }
  };

  const filteredKeywords = keywords
    .filter(kw => kw.keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    })
    .slice(0, maxRows);

  const getPositionChangeIndicator = (change: number | undefined) => {
    if (change === undefined || change === null) {
      return <MinusIcon className="h-4 w-4 text-gray-400" />;
    }
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-green-600">
          <ArrowUpIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}</span>
        </div>
      );
    }
    if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-red-600">
          <ArrowDownIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{Math.abs(change).toFixed(1)}</span>
        </div>
      );
    }
    return <MinusIcon className="h-4 w-4 text-gray-400" />;
  };

  const getPositionBadgeColor = (position: number): string => {
    if (position <= 3) return 'bg-green-100 text-green-800';
    if (position <= 10) return 'bg-blue-100 text-blue-800';
    if (position <= 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Top Keywords ({keywords.length})
          </h3>
          {showSearch && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('keyword')}
                className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Keyword
              </th>
              <th
                onClick={() => handleSort('position')}
                className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24"
              >
                Position
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                Change
              </th>
              <th
                onClick={() => handleSort('impressions')}
                className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-28"
              >
                Impressions
              </th>
              <th
                onClick={() => handleSort('clicks')}
                className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
              >
                Clicks
              </th>
              <th
                onClick={() => handleSort('ctr')}
                className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-20"
              >
                CTR
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredKeywords.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {searchTerm ? 'No keywords match your search' : 'No keyword data available'}
                </td>
              </tr>
            ) : (
              filteredKeywords.map((kw, index) => (
                <tr key={kw.keyword} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-gray-900 font-medium truncate block max-w-xs">
                      {kw.keyword}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${getPositionBadgeColor(kw.position)}`}>
                      {kw.position.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {getPositionChangeIndicator(kw.positionChange)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                    {new Intl.NumberFormat('en-US').format(kw.impressions)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                    {new Intl.NumberFormat('en-US').format(kw.clicks)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                    {kw.ctr.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
