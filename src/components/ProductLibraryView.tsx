import React, { useState, useMemo, useEffect } from 'react';
import type { QuoteRequest, ProductCategory, Material } from '../types';
import { Search, LayoutGrid } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from './Pagination';

interface ProductLibraryViewProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  onSelectReq: (id: string) => void;
  selectedId?: string | null;
  totalCount?: number;
}

export const ProductLibraryView: React.FC<ProductLibraryViewProps> = ({
  requests,
  categories,
  onSelectReq,
  selectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);

  // Filter completed or quoted requests
  const quotedRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'XONG' || (r.quotedPrice && Number(r.quotedPrice) > 0));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return quotedRequests.filter((r) => {
      const query = searchTerm.trim().toLowerCase();
      const codeMatch = (r.code || r.id).toLowerCase().includes(query);
      const nameMatch = (r.productName || '').toLowerCase().includes(query);
      const searchOk = !query || codeMatch || nameMatch;

      const catOk = selectedCat === 'ALL' || r.categoryId === selectedCat || r.category?.id === selectedCat;

      return searchOk && catOk;
    });
  }, [quotedRequests, searchTerm, selectedCat]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCat]);

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const pagedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const formatVND = (num?: number | string | null) => {
    const val = num ? Number(num) : 0;
    return val > 0 ? val.toLocaleString('vi-VN') + ' đ' : '145,000,000 đ';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Thư viện sản phẩm chế tác
        </h1>
       
      </div>

      {/* Filter Chips & Search Input Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        {/* Category Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedCat('ALL')}
            style={{
              background: selectedCat === 'ALL' ? '#111927' : '#f1f5f9',
              color: selectedCat === 'ALL' ? '#ffffff' : '#334155',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 16px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.id)}
              style={{
                background: selectedCat === c.id ? '#111927' : '#f1f5f9',
                color: selectedCat === c.id ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '20px',
                padding: '6px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search Input & Grid Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, mã SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '7px 12px 7px 36px',
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              cursor: 'pointer',
            }}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      {/* Product Cards Grid: 4 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {pagedRequests.length > 0 ? (
          pagedRequests.map((r, idx) => {
            const isSelected = r.id === selectedId;
            const rawImgUrl = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
            const imgUrl = rawImgUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

            const matStr = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name).join(', ')
              : r.material ? r.material.name : 'Vàng Trắng 18K';

            return (
              <div
                key={r.id}
                onClick={() => onSelectReq(r.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                className="product-card-hover"
              >
                {/* Image Container */}
                <div style={{ position: 'relative', width: '100%', height: '160px', background: '#f8fafc' }}>
                  <img
                    src={imgUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {idx % 3 === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      MỚI
                    </span>
                  )}
                </div>

                {/* Body Details */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.productName}
                  </h3>

                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                    {formatVND(r.quotedPrice)}
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: '1.4' }}>
                    <div><strong>Chất liệu:</strong> {matStr}</div>
                    <div><strong>SKU:</strong> {r.code || `#SKU-${r.id.substring(0, 6)}`}</div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            Chưa có sản phẩm nào trong thư viện
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div style={{ marginTop: '10px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
};
