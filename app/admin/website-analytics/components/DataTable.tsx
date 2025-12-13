'use client';

import { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { TableColumnConfig } from '../types/analytics';
import ColumnPicker from './ColumnPicker';

interface DataTableProps<T> {
  data: T[];
  columns: TableColumnConfig[];
  visibleColumns?: string[];
  onColumnVisibilityChange?: (columns: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowKeyField?: string;
  stickyHeader?: boolean;
  maxHeight?: string;
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  visibleColumns: externalVisibleColumns,
  onColumnVisibilityChange,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowKeyField = 'id',
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(
    columns.filter(c => c.defaultVisible).map(c => c.id)
  );

  const visibleColumns = externalVisibleColumns || internalVisibleColumns;

  const handleSort = (field: string) => {
    if (!columns.find(c => c.accessor === field)?.sortable) return;

    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  const displayColumns = columns.filter(c => visibleColumns.includes(c.id));

  const formatValue = (value: unknown, format?: string): string => {
    if (value === null || value === undefined) return '-';

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(Number(value));
      case 'percent':
        return `${Number(value).toFixed(1)}%`;
      case 'decimal':
        return Number(value).toFixed(2);
      case 'number':
        return new Intl.NumberFormat('en-US').format(Math.round(Number(value)));
      default:
        return String(value);
    }
  };

  const handleColumnVisibilityChange = (newColumns: string[]) => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(newColumns);
    } else {
      setInternalVisibleColumns(newColumns);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-gray-100 flex items-center px-4 gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              <div className="h-4 bg-gray-200 rounded w-1/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Column picker button */}
      <div className="flex justify-end px-4 py-2 border-b border-gray-100 bg-gray-50">
        <button
          onClick={() => setShowColumnPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          Columns
        </button>
      </div>

      {/* Table */}
      <div
        className={`overflow-auto ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full">
          <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {displayColumns.map((column) => (
                <th
                  key={column.id}
                  onClick={() => handleSort(column.accessor)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200 ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}
                  style={column.width ? { width: column.width } : undefined}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    {column.sortable && sortField === column.accessor && (
                      sortDirection === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length} className="px-4 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={String(row[rowKeyField]) || index}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                >
                  {displayColumns.map((column) => (
                    <td
                      key={column.id}
                      className={`px-4 py-3 text-sm text-gray-900 ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                      }`}
                    >
                      {formatValue(row[column.accessor], column.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Column picker modal */}
      {showColumnPicker && (
        <ColumnPicker
          columns={columns}
          visibleColumns={visibleColumns}
          onVisibilityChange={handleColumnVisibilityChange}
          onClose={() => setShowColumnPicker(false)}
        />
      )}
    </div>
  );
}
