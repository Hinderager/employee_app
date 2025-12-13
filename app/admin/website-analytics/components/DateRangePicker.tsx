'use client';

import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { DateRange } from '../types/analytics';

interface DateRangePickerProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange, startDate?: string, endDate?: string) => void;
  customStartDate?: string;
  customEndDate?: string;
}

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
];

export default function DateRangePicker({
  selectedRange,
  onRangeChange,
  customStartDate,
  customEndDate,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(selectedRange === 'custom');
  const [startDate, setStartDate] = useState(customStartDate || '');
  const [endDate, setEndDate] = useState(customEndDate || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRangeSelect = (range: DateRange) => {
    if (range === 'custom') {
      setShowCustom(true);
    } else {
      onRangeChange(range);
      setIsOpen(false);
      setShowCustom(false);
    }
  };

  const handleCustomApply = () => {
    if (startDate && endDate) {
      onRangeChange('custom', startDate, endDate);
      setIsOpen(false);
    }
  };

  const getDisplayLabel = (): string => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = new Date(customEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${start} - ${end}`;
    }
    return rangeOptions.find(o => o.value === selectedRange)?.label || 'Select range';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <CalendarIcon className="h-5 w-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{getDisplayLabel()}</span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
          {/* Preset options */}
          <div className="py-1">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRangeSelect(option.value)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                  selectedRange === option.value && option.value !== 'custom'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom date picker */}
          {showCustom && (
            <div className="border-t border-gray-100 p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate || undefined}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCustomApply}
                disabled={!startDate || !endDate}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
