'use client';

import { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { TableColumnConfig } from '../types/analytics';

interface ColumnPickerProps {
  columns: TableColumnConfig[];
  visibleColumns: string[];
  onVisibilityChange: (columns: string[]) => void;
  onClose: () => void;
}

export default function ColumnPicker({
  columns,
  visibleColumns,
  onVisibilityChange,
  onClose,
}: ColumnPickerProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);

  const handleToggle = (columnId: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        // Don't allow deselecting all columns
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(c => c.id));
  };

  const handleSelectDefault = () => {
    setSelectedColumns(columns.filter(c => c.defaultVisible).map(c => c.id));
  };

  const handleApply = () => {
    onVisibilityChange(selectedColumns);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Columns</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-100 bg-gray-50">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={handleSelectDefault}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Reset to Default
          </button>
        </div>

        {/* Column list */}
        <div className="max-h-80 overflow-y-auto">
          {columns.map((column) => (
            <button
              key={column.id}
              onClick={() => handleToggle(column.id)}
              className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">{column.label}</span>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedColumns.includes(column.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}
              >
                {selectedColumns.includes(column.id) && (
                  <CheckIcon className="h-3 w-3 text-white" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
