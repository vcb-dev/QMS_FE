import React, { useState, useMemo, useEffect } from 'react';
import type { QuoteRequest, ProductCategory, Material } from '../types';
import { Search } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from './Pagination';
import { formatCurrency } from '../utils/currency';

interface ProductLibraryViewProps {
  requests: QuoteRequest[];
  categories: ProductCategory[];
  materials: Material[];
  onSelectReq: (id: string) => void;
  selectedId?: string | null;
  totalCount?: number;
}

type SortMode = 'PRICE_DESC' | 'PRICE_ASC' | 'RECENT';
type TimeRange = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

export const ProductLibraryView: React.FC<ProductLibraryViewProps> = ({
  requests,
  categories,
  materials,
  selectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMat, setSelectedMat] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('PRICE_DESC');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);

  // Filter completed or quoted requests
  const quotedRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'XONG' || (r.quotedPrice && Number(r.quotedPrice) > 0));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const now = new Date();
    let rangeCutoff: Date | null = null;
    if (timeRange === 'TODAY') rangeCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (timeRange === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      rangeCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (timeRange === 'THIS_MONTH') rangeCutoff = new Date(now.getFullYear(), now.getMonth(), 1);

    const list = quotedRequests.filter((r) => {
      const query = searchTerm.trim().toLowerCase();
      const codeMatch = (r.code || r.id).toLowerCase().includes(query);
      const nameMatch = (r.productName || '').toLowerCase().includes(query);
      const searchOk = !query || codeMatch || nameMatch;

      const catOk = selectedCat === 'ALL' || r.categoryId === selectedCat || r.category?.id === selectedCat;

      const matOk = selectedMat === 'ALL'
        || r.material?.id === selectedMat
        || (r.materials || []).some((m) => m.id === selectedMat);

      const refDate = r.quotedDate || r.createdAt;
      const timeOk = !rangeCutoff || (refDate ? new Date(refDate) >= rangeCutoff : false);

      return searchOk && catOk && matOk && timeOk;
    });

    return list.sort((a, b) => {
      if (sortMode === 'PRICE_DESC') return (Number(b.quotedPrice) || 0) - (Number(a.quotedPrice) || 0);
      if (sortMode === 'PRICE_ASC') return (Number(a.quotedPrice) || 0) - (Number(b.quotedPrice) || 0);
      const dateA = new Date(a.quotedDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.quotedDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [quotedRequests, searchTerm, selectedCat, selectedMat, sortMode, timeRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCat, selectedMat, sortMode, timeRange]);

  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const pagedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const formatVND = (num?: number | string | null) => {
    const val = num ? Number(num) : 0;
    return val > 0 ? formatCurrency(val) : 'Chưa có giá';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Quản Lý Sản Phẩm
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
          Xếp hạng sản phẩm đã báo giá cho khách theo giá, mốc thời gian và phân loại
        </p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        {/* Category Dropdown */}
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '160px',
          }}
        >
          <option value="ALL">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Material Dropdown */}
        <select
          value={selectedMat}
          onChange={(e) => setSelectedMat(e.target.value)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '160px',
          }}
        >
          <option value="ALL">Tất cả chất liệu</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {/* Time Range Dropdown */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '140px',
          }}
        >
          <option value="ALL">Mọi thời gian</option>
          <option value="TODAY">Hôm nay</option>
          <option value="THIS_WEEK">Tuần này</option>
          <option value="THIS_MONTH">Tháng này</option>
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0f172a',
            outline: 'none',
            cursor: 'pointer',
            minWidth: '150px',
          }}
        >
          <option value="PRICE_DESC">Giá cao nhất</option>
          <option value="PRICE_ASC">Giá thấp nhất</option>
          <option value="RECENT">Mới nhất</option>
        </select>

        {/* Search Input */}
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
              borderRadius: '8px',
              padding: '7px 12px 7px 36px',
              fontSize: '12.5px',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
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
                style={{
                  background: '#ffffff',
                  border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
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
                  {sortMode === 'PRICE_DESC' && (
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
                      #{(currentPage - 1) * pageSize + idx + 1}
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
