// frontend/src/components/products/SortDropdown.tsx
// FIXED: Aligned with backend API - separate sort field and order parameters

import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Valid sort options that match backend API
export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'createdAt-desc' | 'popularity-desc' | 'rating-desc';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  const sortOptions = [
    { value: 'name-asc' as SortOption, label: 'Name (A-Z)' },
    { value: 'name-desc' as SortOption, label: 'Name (Z-A)' },
    { value: 'price-asc' as SortOption, label: 'Price (Low to High)' },
    { value: 'price-desc' as SortOption, label: 'Price (High to Low)' },
    { value: 'createdAt-desc' as SortOption, label: 'Newest First' },
    { value: 'popularity-desc' as SortOption, label: 'Most Popular' },
    { value: 'rating-desc' as SortOption, label: 'Highest Rated' }
  ];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
};

// Utility function to parse sort option into backend API format
export const parseSortOption = (sortOption: SortOption): SortConfig => {
  const [sortBy, sortOrder] = sortOption.split('-') as [string, 'asc' | 'desc'];
  return { sortBy, sortOrder };
};

export default SortDropdown;