import React, { useState, useMemo, useEffect } from 'react';
import type { SortModeLibrary, LibraryPageProps, TimeRange, ProductOptionCard } from '../types';
import { Search } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from '../components/Pagination';
import { formatCurrency } from '../utils/currency';
import { ProductSpecModal } from '../components/ProductSpecModal';

const STATUS_TAG: Record<string, { label: string; bg: string; color: string }> = {
  CLOSED: { label: 'Đã chốt', bg: '#dcfce7', color: '#15803d' },
  SELECTED: { label: 'Đang chọn', bg: '#e2e8f0', color: '#475569' },
};

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
  const [detailItem, setDetailItem] = useState<ProductOptionCard | null>(null);

  // Mỗi phương án báo giá (QuoteOption) là 1 "sản phẩm" riêng — 1 đơn có nhiều phương án thì ra
  // nhiều thẻ. Chỉ lấy phương án thuộc đơn đã QUOTED/CLOSED: completeQuote (BE) xóa sạch & ghi đè
  // toàn bộ options bằng đúng bộ ORDER gửi lên khi duyệt, nên option còn tồn tại trên đơn ở 2 status
  // này chắc chắn đã qua ORDER — phương án Sale tự tạo (quick-quote, đơn còn PROCESSING) chưa duyệt
  // sẽ không có mặt ở đây.
  const productOptions = useMemo<ProductOptionCard[]>(() => {
    const items: ProductOptionCard[] = [];
    for (const r of requests) {
      if (r.status !== 'QUOTED' && r.status !== 'CLOSED') continue;
      const catName = r.category?.name || '';

      for (const o of r.options || []) {
        if (o.quotedPrice == null) continue;

        const matStr =
          o.materials && o.materials.length > 0
            ? o.materials.map((m) => m.materialName || m.material?.name).filter(Boolean).join(', ')
            : o.materialName || 'Chưa rõ chất liệu';

        const weightVal = o.weightChi;
        const weightDisplay = weightVal != null && Number(weightVal) > 0 ? `${weightVal} chỉ` : null;

        let stoneDisplay = 'Không đính đá';
        if (o.stones && o.stones.length > 0) {
          const totalStones = o.stones.reduce((sum, s) => sum + (s.quantity || 1), 0);
          const names = o.stones.map((s) => `${s.quantity}v ${s.stone?.name || s.stoneName || 'đá'}`).join(', ');
          stoneDisplay = `${totalStones} viên (${names})`;
        } else if (o.stoneDescription) {
          stoneDisplay = o.stoneDescription;
        } else if (o.stoneCost && Number(o.stoneCost) > 0) {
          stoneDisplay = `Đá trị giá ${formatCurrency(Number(o.stoneCost))}`;
        }

        items.push({
          key: `${r.id}:${o.id}`,
          requestId: r.id,
          code: r.code,
          categoryId: r.categoryId,
          images: r.images,
          option: o,
          productName: `${catName} ${matStr}`.trim() || 'Sản phẩm chế tác',
          matStr,
          weightDisplay,
          stoneDisplay,
          materialIds: (o.materials || []).map((m) => m.materialId).filter(Boolean),
          requestCreatedAt: r.createdAt,
        });
      }
    }
    return items;
  }, [requests]);

  const filteredOptions = useMemo(() => {
    const now = new Date();
    let rangeCutoff: Date | null = null;
    if (timeRange === 'TODAY') rangeCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (timeRange === 'THIS_WEEK') {
      const day = now.getDay() || 7;
      rangeCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    } else if (timeRange === 'THIS_MONTH') rangeCutoff = new Date(now.getFullYear(), now.getMonth(), 1);

    const list = productOptions.filter((item) => {
      const query = searchTerm.trim().toLowerCase();
      const codeMatch = item.code.toLowerCase().includes(query);
      const nameMatch = item.productName.toLowerCase().includes(query);
      const searchOk = !query || codeMatch || nameMatch;

      const catOk = selectedCat === 'ALL' || item.categoryId === selectedCat;

      const matOk = selectedMat === 'ALL' || item.materialIds.includes(selectedMat);

      const refDate = item.option.quotedDate || item.requestCreatedAt;
      const timeOk = !rangeCutoff || (refDate ? new Date(refDate) >= rangeCutoff : false);

      return searchOk && catOk && matOk && timeOk;
    });

    return list.sort((a, b) => {
      if (sortMode === 'PRICE_DESC') return (Number(b.option.quotedPrice) || 0) - (Number(a.option.quotedPrice) || 0);
      if (sortMode === 'PRICE_ASC') return (Number(a.option.quotedPrice) || 0) - (Number(b.option.quotedPrice) || 0);
      const dateA = new Date(a.option.quotedDate || a.requestCreatedAt || 0).getTime();
      const dateB = new Date(b.option.quotedDate || b.requestCreatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [productOptions, searchTerm, selectedCat, selectedMat, sortMode, timeRange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCat, selectedMat, sortMode, timeRange]);

  const totalItems = filteredOptions.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const pagedOptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOptions.slice(start, start + pageSize);
  }, [filteredOptions, currentPage, pageSize]);

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
        {pagedOptions.length > 0 ? (
          pagedOptions.map((item, idx) => {
            const isSelected = item.requestId === selectedId;
            const rawImgUrl = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
            const imgUrl = rawImgUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
            const tag = item.option.selectionStatus ? STATUS_TAG[item.option.selectionStatus] : undefined;

            return (
              <div
                key={item.key}
                onClick={() => setDetailItem(item)}
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
                  {tag && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        background: tag.bg,
                        color: tag.color,
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}
                    >
                      {tag.label}
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
                    {item.code}
                  </span>
                </div>

                {/* Body Details */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.productName}>
                    {item.productName}
                  </h3>

                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
                    {formatVND(item.option.quotedPrice)}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.4' }}>
                    <div>
                      <strong style={{ color: '#64748b' }}>Chất liệu:</strong> {item.matStr}
                    </div>
                    {item.weightDisplay && (
                      <div>
                        <strong style={{ color: '#64748b' }}>Khối lượng:</strong> <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.weightDisplay}</span>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: '#64748b' }}>Đá quý:</strong> <span style={{ color: item.stoneDisplay === 'Không đính đá' ? '#94a3b8' : '#0f172a', fontWeight: item.stoneDisplay === 'Không đính đá' ? 500 : 700 }}>{item.stoneDisplay}</span>
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

      {detailItem && (
        <ProductSpecModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onViewRequest={() => {
            const requestId = detailItem.requestId;
            setDetailItem(null);
            onSelectReq(requestId);
          }}
        />
      )}
    </div>
  );
};
