'use client';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import * as Tooltip from '@radix-ui/react-tooltip';

export interface Column<T> {
  id: string;
  key?: keyof T;
  header: string;
  flex?: number;
  ellipsis?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (
    value: T[keyof T] | undefined,
    item: T,
    index: number
  ) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  getRowClassName?: (item: T, index: number) => string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  emptyIcon = <FiUser className="w-16 h-16 text-gray-300" />,
  getRowClassName,
}: DataTableProps<T>) {
  const totalFlex = columns.reduce((sum, col) => sum + (col.flex || 1), 0);

  const getColumnFlexPercent = (flex?: number) => {
    const colFlex = flex || 1;
    const percentage = (colFlex / totalFlex) * 100;
    return `${percentage}%`;
  };

  const getGridTemplateStyle = () => {
    const template = columns
      .map((col) => getColumnFlexPercent(col.flex))
      .join(' ');
    return { gridTemplateColumns: template };
  };

  const getAlignClass = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'justify-center';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-start';
    }
  };

  const renderEllipsisText = (text: unknown) => {
    const displayText = String(text ?? '');

    if (displayText.length <= 20) {
      return <span className="block truncate">{displayText}</span>;
    }

    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            tabIndex={0}
            className="block truncate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
          >
            {displayText}
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-[70] max-w-xs border-2 border-zinc-950 bg-zinc-950 px-3 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_#facc15]"
          >
            {displayText}
            <Tooltip.Arrow className="fill-zinc-950" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  };

  if (loading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden border-2 border-zinc-500 bg-white"
        role="status"
        aria-label="正在加载表格数据"
      >
        <div
          className="grid border-b-4 border-zinc-950 bg-zinc-200 px-4 py-3"
          style={getGridTemplateStyle()}
        >
          {columns.map((column) => (
            <div key={column.id} className="px-2 py-1">
              <div className="h-4 w-16 animate-pulse bg-zinc-300" />
            </div>
          ))}
        </div>
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="grid border-b-2 border-zinc-200 px-4 py-3"
            style={getGridTemplateStyle()}
          >
            {columns.map((column) => (
              <div key={column.id} className="px-2 py-1">
                <div className="h-4 w-3/4 animate-pulse bg-zinc-100" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={300}>
    <div className=" bg-white border-2 rounded-sm border-gray-500  overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="overflow-y-auto flex-1">
        {/* 表头 */}
        <div
          className="bg-gray-200 border-b-4 border-black px-4 py-3 font-black text-sm sticky top-0 z-10"
          style={{ display: 'grid', ...getGridTemplateStyle() }}
        >
          {columns.map((col) => (
            <div
              key={col.id}
              className={`px-2 py-1 min-w-0 flex items-center ${getAlignClass(col.align)}`}
            >
              {col.header}
            </div>
          ))}
        </div>

        {/* 数据行 */}
        {data.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16"
            style={{ gridColumn: '1 / -1' }}
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              {emptyIcon}
            </div>
            <p className="text-gray-500 font-bold mt-6 text-lg">{emptyText}</p>
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={index}
              className={`border-b-2 border-black px-4 py-3 items-center hover:bg-yellow-50 transition-all duration-150 ${
                getRowClassName ? getRowClassName(item, index) : ''
              }`}
              style={{ display: 'grid', ...getGridTemplateStyle() }}
            >
              {columns.map((col) => {
                const cellContent = col.key ? item[col.key] : undefined;
                return (
                  <div
                    key={col.id}
                    className={`px-2 py-1 min-w-0 flex items-center ${getAlignClass(col.align)}`}
                  >
                    {col.render
                      ? col.render(cellContent, item, index)
                      : col.ellipsis
                        ? renderEllipsisText(cellContent)
                        : String(cellContent ?? '')}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
    </Tooltip.Provider>
  );
}
