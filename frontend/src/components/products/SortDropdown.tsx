import React from 'react';
import { ChevronDown } from 'lucide-react';

export type SortOption = 'name' | 'price-low' | 'price-high' | 'newest' | 'popular';

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ value, onChange }) => {
  const sortOptions = [
    { value: 'name' as SortOption, label: 'Name (A-Z)' },
    { value: 'price-low' as SortOption, label: 'Price (Low to High)' },
    { value: 'price-high' as SortOption, label: 'Price (High to Low)' },
    { value: 'newest' as SortOption, label: 'Newest First' },
    { value: 'popular' as SortOption, label: 'Most Popular' }
  ];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

export default SortDropdown;