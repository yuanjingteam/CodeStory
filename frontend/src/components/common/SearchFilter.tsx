'use client';
import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterField {
  id: string;
  label: string;
  type: 'select' | 'input' | 'checkbox';
  value: string | number | boolean;
  options?: FilterOption[];
  placeholder?: string;
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters: FilterField[];
  onFilterChange: (filters: FilterField[]) => void;
  onApplyFilters?: () => void;
  actionSlot?: React.ReactNode;
}

export default function SearchFilter({
  searchTerm,
  onSearchChange,
  searchPlaceholder = '搜索...',
  filters = [],
  onFilterChange,
  onApplyFilters,
  actionSlot,
}: SearchFilterProps) {
  const handleFilterChange = (
    filterId: string,
    value: string | number | boolean
  ) => {
    const updatedFilters = filters.map((filter) =>
      filter.id === filterId ? { ...filter, value } : filter
    );
    onFilterChange(updatedFilters);
  };

  const renderFilter = (filter: FilterField) => (
    <div key={filter.id} className="flex items-center gap-2">
      <label className="font-bold text-gray-700 whitespace-nowrap">
        {filter.label}
      </label>
      {filter.type === 'select' && filter.options && (
        <select
          value={String(filter.value ?? '')}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="border-2 border-black px-3 py-1 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        >
          {filter.options.map((option, optIndex) => (
            <option key={optIndex} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {filter.type === 'input' && (
        <input
          type="text"
          placeholder={filter.placeholder}
          value={String(filter.value ?? '')}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="border-2 border-black px-3 py-1 font-bold bg-white shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
        />
      )}
      {filter.type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(filter.value)}
            onChange={(e) =>
              handleFilterChange(filter.id, e.target.checked)
            }
            className="w-4 h-4 border-2 border-black accent-purple-600"
          />
          <span className="text-sm">是</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="bg-white border-3 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] p-3">
      <div className="flex flex-wrap gap-4 items-center">
        {filters.map(renderFilter)}

        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-black font-bold bg-gray-100 focus:outline-none focus:bg-white transition-colors"
          />
        </div>

        {onApplyFilters && filters.length > 0 && (
          <button
            onClick={onApplyFilters}
            className="flex items-center gap-1 px-4 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all shrink-0"
          >
            <FiFilter className="w-4 h-4" />
            筛选
          </button>
        )}

        {actionSlot && <div className="ml-auto shrink-0">{actionSlot}</div>}
      </div>
    </div>
  );
}
