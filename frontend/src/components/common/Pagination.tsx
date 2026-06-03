'use client';
import React from 'react';
import { IoArrowBack, IoArrowForward } from 'react-icons/io5';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  showPageNumbers?: boolean;
  maxPageNumbers?: number;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  showPageNumbers = true,
  maxPageNumbers = 5,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  // 计算需要显示的页码范围
  const getPageNumbers = () => {
    const pageNumbers: number[] = [];

    if (totalPages <= maxPageNumbers) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - Math.floor(maxPageNumbers / 2));
      const endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

      if (endPage - startPage + 1 < maxPageNumbers) {
        startPage = Math.max(1, endPage - maxPageNumbers + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* 左侧：每页条数选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 font-bold">每页显示：</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border-2 border-gray-300 py-1 font-bold bg-white rounded-md transition-all"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600 font-bold">
          共 {totalItems} 条记录
        </span>
      </div>

      {/* 右侧：分页导航 */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-600 font-bold">
          当前第 {currentPage}/{totalPages} 页
        </span>

        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-8 h-8 py-1 border-2 flex items-center justify-center rounded-md border-gray-300 font-bold transition-all ${
            currentPage === 1
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
          }`}
        >
          <IoArrowBack className="w-4 h-4" />
        </button>

        {/* 页码 */}
        {showPageNumbers &&
          getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-md border-2 border-gray-500 font-bold transition-all ${
                currentPage === page
                  ? 'bg-purple-500 text-white shadow-none'
                  : 'bg-white  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
              }`}
            >
              {page}
            </button>
          ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`w-8 h-8 py-1 border-2 flex items-center justify-center rounded-md border-gray-300 font-bold transition-all ${
            currentPage === totalPages
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
          }`}
        >
          <IoArrowForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
