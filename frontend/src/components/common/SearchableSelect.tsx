'use client';

import {
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

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
  ariaLabel?: string;
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
  ariaLabel = '选择选项',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? '';

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    if (!keyword) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase().includes(keyword)
    );
  }, [options, search]);

  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(filteredOptions.length - 1, 0)
  );

  useEffect(() => {
    if (!open) return;
    optionRefs.current[safeActiveIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, safeActiveIndex]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch('');
      setActiveIndex(0);
    }
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    handleOpenChange(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (filteredOptions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, filteredOptions.length - 1)
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleSelect(filteredOptions[safeActiveIndex].value);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <Button
          variant="secondary"
          fullWidth
          disabled={disabled || loading}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          className="justify-between px-3 font-medium"
          rightIcon={
            <FiChevronDown
              className={`size-4 transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          }
        >
          <span
            className={
              selectedLabel ? 'truncate text-zinc-950' : 'truncate text-zinc-500'
            }
          >
            {loading ? '加载中...' : selectedLabel || placeholder}
          </span>
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-56 border-2 border-zinc-950 bg-white shadow-[4px_4px_0_0_#18181b]"
        >
          <div className="relative border-b-2 border-zinc-950 p-2">
            <FiSearch
              className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listboxId}
              aria-activedescendant={
                filteredOptions[safeActiveIndex]
                  ? `${listboxId}-${safeActiveIndex}`
                  : undefined
              }
              className="pl-9"
            />
          </div>

          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-52 overflow-y-auto p-1"
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-zinc-500">
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((option, index) => {
                const selected = option.value === value;
                const active = index === safeActiveIndex;

                return (
                  <button
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    id={`${listboxId}-${index}`}
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(option.value)}
                    className={[
                      'flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium outline-none',
                      'hover:bg-white hover:shadow-[inset_4px_0_0_0_#18181b] focus-visible:bg-white',
                      active ? 'bg-white shadow-[inset_4px_0_0_0_#18181b]' : '',
                      selected ? 'font-black' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? (
                      <FiCheck className="size-4 shrink-0" aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
