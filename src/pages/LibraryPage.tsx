import React, { useState, useMemo, useEffect } from 'react';
import type { SortModeLibrary, LibraryPageProps, TimeRange } from '../types';
import { Search } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from '../components/Pagination';
import { formatCurrency } from '../utils/currency';


export const LibraryPage: React.FC<LibraryPageProps> = ({
  requests,
  categories,
  materials,
  onSelectReq,
  selectedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMat, setSelectedMat] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortModeLibrary>('PRICE_DESC');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);

  // Filter completed or quoted requests
  const quotedRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'QUOTED' || r.status === 'CLOSED' || (r.quotedPrice && Number(r.quotedPrice) > 0));
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
          onChange={(e) => setSortMode(e.target.value as SortModeLibrary)}
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

            // Tìm option chính / được chọn để lấy đúng thông số chi tiết
            const activeOpt =
              r.options?.find((o) => o.selectionStatus === 'CLOSED') ||
              r.options?.find((o) => o.selectionStatus === 'SELECTED') ||
              r.options?.[0];

            // "Vàng Trắng 18K" cũ là placeholder demo, hiện SAI cho mọi sản phẩm khi thiếu data thật.
            const matStr =
              activeOpt?.materials && activeOpt.materials.length > 0
                ? activeOpt.materials.map((m) => m.materialName || m.material?.name).filter(Boolean).join(', ')
                : activeOpt?.materialName || (r.materials && r.materials.length > 0
                  ? r.materials.map((m) => m.name).join(', ')
                  : r.material ? r.material.name : 'Chưa rõ chất liệu');

            const weightVal = activeOpt?.weightChi ?? (r as any).weightChi;
            const weightDisplay = weightVal != null && Number(weightVal) > 0 ? `${weightVal} chỉ` : null;

            let stoneDisplay = 'Không đính đá';
            if (activeOpt?.stones && activeOpt.stones.length > 0) {
              const totalStones = activeOpt.stones.reduce((sum, s) => sum + (s.quantity || 1), 0);
              const names = activeOpt.stones.map((s) => `${s.quantity}v ${s.stone?.name || s.stoneName || 'đá'}`).join(', ');
              stoneDisplay = `${totalStones} viên (${names})`;
            } else if (activeOpt?.stoneDescription) {
              stoneDisplay = activeOpt.stoneDescription;
            } else if (activeOpt?.stoneCost && Number(activeOpt.stoneCost) > 0) {
              stoneDisplay = `Đá trị giá ${formatCurrency(Number(activeOpt.stoneCost))}`;
            }

            return (
              <div
                key={r.id}
                onClick={() => onSelectReq(r.id)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
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
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {r.code}
                  </span>
                </div>

                {/* Body Details */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.productName}>
                    {r.productName}
                  </h3>

                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
                    {formatVND(r.quotedPrice)}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.4' }}>
                    <div>
                      <strong style={{ color: '#64748b' }}>Chất liệu:</strong> {matStr}
                    </div>
                    {weightDisplay && (
                      <div>
                        <strong style={{ color: '#64748b' }}>Khối lượng:</strong> <span style={{ fontWeight: 700, color: '#0f172a' }}>{weightDisplay}</span>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: '#64748b' }}>Đá quý:</strong> <span style={{ color: stoneDisplay === 'Không đính đá' ? '#94a3b8' : '#0f172a', fontWeight: stoneDisplay === 'Không đính đá' ? 500 : 700 }}>{stoneDisplay}</span>
                    </div>
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
