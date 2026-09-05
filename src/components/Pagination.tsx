import React from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const DEFAULT_PAGE_SIZE_OPTIONS = [6, 8, 12, 16, 24, 48];

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages || totalPages === 0;

  return (
    <div className="flex items-center justify-between py-[12px] px-[16px] bg-white border-t border-[#e2e8f0] rounded-b-[10px] text-[12.5px] text-[#64748b]">
      {/* Summary Info & Page Size */}
      <div className="flex items-center gap-[14px]">
        <span>
          Hiển thị <strong className="text-[#0f172a]">{startItem} - {endItem}</strong> trên tổng số <strong className="text-[#0f172a]">{totalItems}</strong> bản ghi
        </span>
        <div className="flex items-center gap-[6px]">
          <span>Số bản ghi / trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="py-[4px] px-[8px] rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-[12px] font-semibold outline-none cursor-pointer"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-[4px]">
        <button
          onClick={() => onPageChange(1)}
          disabled={isFirst}
          className={clsx(
            "flex items-center py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1]",
            isFirst ? "bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed" : "bg-white text-[#475569] cursor-pointer"
          )}
          title="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirst}
          className={clsx(
            "flex items-center py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1]",
            isFirst ? "bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed" : "bg-white text-[#475569] cursor-pointer"
          )}
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={clsx(
              "py-[4px] px-[10px] rounded-[6px] text-[12px] cursor-pointer min-w-[28px]",
              page === currentPage
                ? "border border-[#2563eb] bg-[#2563eb] text-white font-bold"
                : "border border-[#cbd5e1] bg-white text-[#334155] font-semibold"
            )}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLast}
          className={clsx(
            "flex items-center py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1]",
            isLast ? "bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed" : "bg-white text-[#475569] cursor-pointer"
          )}
          title="Trang sau"
        >
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLast}
          className={clsx(
            "flex items-center py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1]",
            isLast ? "bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed" : "bg-white text-[#475569] cursor-pointer"
          )}
          title="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
