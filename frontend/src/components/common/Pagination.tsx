'use client';
import { IoArrowBack, IoArrowForward } from 'react-icons/io5';
import Button from '@/components/ui/Button';
import NativeSelect from '@/components/ui/NativeSelect';

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
        <NativeSelect
          aria-label="每页显示条数"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="w-auto py-1.5"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </NativeSelect>
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
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          size="icon"
          aria-label="上一页"
        >
          <IoArrowBack className="size-4" aria-hidden="true" />
        </Button>

        {/* 页码 */}
        {showPageNumbers &&
          getPageNumbers().map((page) => (
            <Button
              key={page}
              onClick={() => onPageChange(page)}
              variant={currentPage === page ? 'primary' : 'secondary'}
              size="icon"
              aria-label={`第 ${page} 页`}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </Button>
          ))}

        {/* 下一页 */}
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={totalPages === 0 || currentPage >= totalPages}
          size="icon"
          aria-label="下一页"
        >
          <IoArrowForward className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
