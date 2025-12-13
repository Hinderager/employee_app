'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Site {
  id: string;
  slug: string;
  name: string;
  domain: string;
  isMainSite?: boolean;
}

interface SiteSelectorDropdownProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelectSite: (site: Site | null) => void;
  showAllOption?: boolean;
  loading?: boolean;
}

export default function SiteSelectorDropdown({
  sites,
  selectedSite,
  onSelectSite,
  showAllOption = true,
  loading = false,
}: SiteSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSelect = (site: Site | null) => {
    onSelectSite(site);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="w-64 h-10 bg-gray-100 rounded-lg animate-pulse"></div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <GlobeAltIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {selectedSite ? selectedSite.name : 'All Sites'}
          </span>
        </div>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
          {showAllOption && (
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                !selectedSite ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">All Sites</span>
              </div>
              {!selectedSite && (
                <CheckIcon className="h-5 w-5 text-blue-600" />
              )}
            </button>
          )}

          {showAllOption && <div className="border-t border-gray-100" />}

          {/* Main site first */}
          {sites.filter(s => s.isMainSite).map((site) => (
            <button
              key={site.id}
              onClick={() => handleSelect(site)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedSite?.id === site.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{site.name}</span>
                <span className="text-xs text-gray-500">{site.domain}</span>
              </div>
              {selectedSite?.id === site.id && (
                <CheckIcon className="h-5 w-5 text-blue-600" />
              )}
            </button>
          ))}

          {sites.filter(s => s.isMainSite).length > 0 && (
            <div className="border-t border-gray-100" />
          )}

          {/* Microsites */}
          {sites.filter(s => !s.isMainSite).map((site) => (
            <button
              key={site.id}
              onClick={() => handleSelect(site)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                selectedSite?.id === site.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">{site.name}</span>
                <span className="text-xs text-gray-500">{site.domain}</span>
              </div>
              {selectedSite?.id === site.id && (
                <CheckIcon className="h-5 w-5 text-blue-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
