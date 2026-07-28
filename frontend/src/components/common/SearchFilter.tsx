'use client';
import React from 'react';
import { FiSearch, FiFilter } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';

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
      <label
        htmlFor={`filter-${filter.id}`}
        className="whitespace-nowrap font-bold text-zinc-700"
      >
        {filter.label}
      </label>
      {filter.type === 'select' && filter.options && (
        <NativeSelect
          id={`filter-${filter.id}`}
          value={String(filter.value ?? '')}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="w-auto min-w-28 py-1.5"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )}
      {filter.type === 'input' && (
        <Input
          id={`filter-${filter.id}`}
          type="text"
          placeholder={filter.placeholder}
          value={String(filter.value ?? '')}
          onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          className="w-auto min-w-36 py-1.5"
        />
      )}
      {filter.type === 'checkbox' && (
        <label
          htmlFor={`filter-${filter.id}`}
          className="flex cursor-pointer items-center gap-2"
        >
          <input
            id={`filter-${filter.id}`}
            type="checkbox"
            checked={Boolean(filter.value)}
            onChange={(e) => handleFilterChange(filter.id, e.target.checked)}
            className="size-5 accent-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          />
          <span className="text-sm">是</span>
        </label>
      )}
    </div>
  );

  return (
    <div className="border-2 border-zinc-300 bg-white p-3">
      <div className="flex flex-wrap gap-4 items-center">
        {filters.map(renderFilter)}

        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            aria-label="搜索"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-zinc-50 pl-10 focus-visible:bg-white"
          />
        </div>

        {onApplyFilters && filters.length > 0 && (
          <Button
            onClick={onApplyFilters}
            variant="primary"
            leftIcon={<FiFilter className="size-4" aria-hidden="true" />}
            className="shrink-0"
          >
            筛选
          </Button>
        )}

        {actionSlot && <div className="ml-auto shrink-0">{actionSlot}</div>}
      </div>
    </div>
  );
}
