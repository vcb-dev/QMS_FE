import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
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

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      borderRadius: '0 0 10px 10px',
      fontSize: '12.5px',
      color: '#64748b',
    }}>
      {/* Summary Info & Page Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span>
          Hiển thị <strong style={{ color: '#0f172a' }}>{startItem} - {endItem}</strong> trên tổng số <strong style={{ color: '#0f172a' }}>{totalItems}</strong> bản ghi
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Số bản ghi / trang:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={12}>12</option>
            <option value={16}>16</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>

      {/* Navigation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage === 1 ? '#cbd5e1' : '#475569',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Trang đầu"
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
            color: currentPage === 1 ? '#cbd5e1' : '#475569',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: `1px solid ${page === currentPage ? '#2563eb' : '#cbd5e1'}`,
              background: page === currentPage ? '#2563eb' : '#ffffff',
              color: page === currentPage ? '#ffffff' : '#334155',
              fontWeight: page === currentPage ? 700 : 600,
              fontSize: '12px',
              cursor: 'pointer',
              minWidth: '28px',
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#ffffff',
            color: currentPage === totalPages || totalPages === 0 ? '#cbd5e1' : '#475569',
            cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Trang sau"
        >
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#ffffff',
            color: currentPage === totalPages || totalPages === 0 ? '#cbd5e1' : '#475569',
            cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Trang cuối"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};
