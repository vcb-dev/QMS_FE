import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortModeLibrary, LibraryPageProps, TimeRange, ProductOptionCard } from '../types';
import { Search, RefreshCw } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from '../components/Pagination';
import { formatCurrency } from '../utils/currency';
import { ProductSpecModal } from '../components/ProductSpecModal';
import { displayPrice } from '../utils/quoteOption';
import { fetchLibraryProducts } from '../services/api';

const STATUS_TAG: Record<string, { label: string; bg: string; color: string }> = {
  CLOSED: { label: 'Đã chốt', bg: '#dcfce7', color: '#15803d' },
  SELECTED: { label: 'Đang chọn', bg: '#e2e8f0', color: '#475569' },
};

// 4 dropdown lọc dùng chung style này, chỉ khác minWidth — cùng cách FilterBar.tsx đã làm.
const selectStyle = (minWidth: string): React.CSSProperties => ({
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 12px',
  fontSize: '12.5px',
  fontWeight: 700,
  color: '#0f172a',
  outline: 'none',
  cursor: 'pointer',
  minWidth,
});

export const LibraryPage: React.FC<LibraryPageProps> = ({
  categories,
  materials,
  currentRole,
  onSelectReq,
}) => {
  // Seed từ khóa ban đầu từ URL (?q=...) khi nhảy tới đây từ "Xem thêm" ở search tổng Header —
  // chỉ đọc 1 lần lúc mount, sau đó searchTerm là state nội bộ bình thường như cũ.
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMat, setSelectedMat] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortModeLibrary>('PRICE_DESC');
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);
  const [detailItem, setDetailItem] = useState<ProductOptionCard | null>(null);

  const [products, setProducts] = useState<ProductOptionCard[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search 300ms
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCat, selectedMat, sortMode, timeRange]);

  const loadData = async (withLivePrice = false) => {
    if (withLivePrice) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetchLibraryProducts({
        search: debouncedSearch || undefined,
        categoryId: selectedCat !== 'ALL' ? selectedCat : undefined,
        materialId: selectedMat !== 'ALL' ? selectedMat : undefined,
        timeRange,
        sortMode,
        withLivePrice: withLivePrice ? 'true' : undefined,
        page: currentPage,
        limit: pageSize,
      });
      setProducts(res.data || []);
      setTotalItems(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [debouncedSearch, selectedCat, selectedMat, sortMode, timeRange, currentPage, pageSize]);

  const handleRefreshPrices = () => loadData(true);

  const formatVND = (num?: number | string | null) => {
    const val = num ? Number(num) : 0;
    return val > 0 ? formatCurrency(val) : 'Chưa có giá';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            {currentRole === 'SALE' ? 'Thư Viện Sản Phẩm' : 'Quản Lý Sản Phẩm'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Xếp hạng sản phẩm đã báo giá cho khách theo giá, mốc thời gian và phân loại
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefreshPrices}
          disabled={refreshing || loading}
          title="Tính lại giá theo giá kim loại/đá hiện tại"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
            background: '#ffffff', color: '#0f172a', fontSize: '12.5px', fontWeight: 700,
            cursor: refreshing || loading ? 'default' : 'pointer', opacity: refreshing || loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {refreshing ? 'Đang tải giá...' : 'Tải lại giá'}
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        {/* Category Dropdown */}
        <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} style={selectStyle('160px')}>
          <option value="ALL">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Material Dropdown */}
        <select value={selectedMat} onChange={(e) => setSelectedMat(e.target.value)} style={selectStyle('160px')}>
          <option value="ALL">Tất cả chất liệu</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {/* Time Range Dropdown */}
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} style={selectStyle('140px')}>
          <option value="ALL">Mọi thời gian</option>
          <option value="TODAY">Hôm nay</option>
          <option value="THIS_WEEK">Tuần này</option>
          <option value="THIS_MONTH">Tháng này</option>
        </select>

        {/* Sort Dropdown */}
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortModeLibrary)} style={selectStyle('150px')}>
          <option value="PRICE_DESC">Giá cao nhất</option>
          <option value="PRICE_ASC">Giá thấp nhất</option>
          <option value="RECENT">Mới nhất</option>
          <option value="MOST_QUOTED">Báo giá nhiều nhất</option>
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

      {error && <div style={{ color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

      {/* Product Cards Grid: 4 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            Đang tải dữ liệu sản phẩm...
          </div>
        ) : products.length > 0 ? (
          products.map((item, idx) => {
            const rawImgUrl = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
            const imgUrl = rawImgUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
            const tag = item.option.selectionStatus ? STATUS_TAG[item.option.selectionStatus] : undefined;

            return (
              <div
                key={item.key}
                onClick={() => setDetailItem(item)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
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
                  {(sortMode === 'PRICE_DESC' || sortMode === 'MOST_QUOTED') && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={item.productName}>
                      {item.productName}
                    </h3>
                    {item.duplicateCount && item.duplicateCount > 1 && (
                      <span
                        title={`Đã báo giá ${item.duplicateCount} lần cho mẫu này`}
                        style={{
                          flexShrink: 0, fontSize: '10px', fontWeight: 800, color: '#0369a1',
                          background: '#e0f2fe', padding: '2px 6px', borderRadius: '8px',
                        }}
                      >
                        ×{item.duplicateCount}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>
                    {formatVND(displayPrice(item.option))}
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
