'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索...',
  disabled = false,
  loading = false,
  emptyText = '无匹配结果',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    const found = options.find(o => o.value === value);
    return found ? found.label : '';
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const keyword = search.trim().toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(keyword));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(prev => !prev);
            setSearch('');
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-2 border-2 border-black text-left ${
          disabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white cursor-pointer'
        }`}
      >
        <span className={selectedLabel ? 'text-black' : 'text-gray-400'}>
          {loading ? '加载中...' : selectedLabel || placeholder}
        </span>
        <FiChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
            <FiSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-sm focus:outline-none bg-transparent"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">{emptyText}</li>
            ) : (
              filteredOptions.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 ${
                    option.value === value
                      ? 'bg-purple-100 font-bold'
                      : ''
                  }`}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
