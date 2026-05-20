'use client';
import React from 'react';
import { FiUser } from 'react-icons/fi';

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
  maxHeight?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyText = '暂无数据',
  emptyIcon = <FiUser className="w-16 h-16 text-gray-300" />,
  getRowClassName,
  maxHeight,
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
    return (
      <div className="relative group overflow-hidden">
        <span className="block truncate" title={displayText}>
          {displayText}
        </span>

        {displayText.length > 20 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-sm font-bold border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {displayText}

            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex items-center justify-center ">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-bold">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden flex flex-col"
      style={{ height: maxHeight }}
    >
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
  );
}
