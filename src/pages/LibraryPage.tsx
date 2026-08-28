import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SortModeLibrary, LibraryPageProps, TimeRange, ProductOptionCard, StaffUser } from '../types';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from '../components/Pagination';
import { ProductSpecModal } from '../components/ProductSpecModal';
import { displayPrice, formatPriceRange } from '../utils/quoteOption';
import { fetchLibraryProducts, getAllUsersApi } from '../services/api';

// Cùng phong cách popover "Bộ lọc" như FilterBar.tsx (trang Danh Sách Yêu Cầu) — style trùng tên
// nhưng khai báo riêng ở đây vì FilterBar không export ra ngoài.
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

const popoverSelectStyle: React.CSSProperties = {
  ...selectStyle('100%'),
  width: '100%',
  padding: '8px 30px 8px 12px',
  fontWeight: 600,
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  boxSizing: 'border-box',
};

const selectArrowStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  pointerEvents: 'none',
};

const popoverLabelStyle: React.CSSProperties = {
  fontSize: '10.5px',
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: '5px',
  display: 'block',
};

const dateInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  boxSizing: 'border-box',
};

export const LibraryPage: React.FC<LibraryPageProps> = ({
  categories,
  materials,
  currentRole,
  initialTimeRange,
}) => {
  // Seed từ khóa ban đầu từ URL (?q=...) khi nhảy tới đây từ "Xem thêm" ở search tổng Header —
  // chỉ đọc 1 lần lúc mount, sau đó searchTerm là state nội bộ bình thường như cũ.
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedMat, setSelectedMat] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortModeLibrary>('PRICE_DESC');
  // Mặc định ăn theo filter thời gian toàn cục (Dashboard/Danh sách); người dùng đổi tự do sau.
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange ?? 'ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(UI_CONSTANTS.PRODUCT_LIBRARY.DEFAULT_PAGE_SIZE);
  const [detailItem, setDetailItem] = useState<ProductOptionCard | null>(null);

  const [saleStaff, setSaleStaff] = useState<StaffUser[]>([]);
  const [orderStaff, setOrderStaff] = useState<StaffUser[]>([]);

  const [products, setProducts] = useState<ProductOptionCard[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nút "Bộ Lọc" gom danh mục/chất liệu/sale/order/thời gian vào popover — cùng cơ chế với
  // FilterBar.tsx (trang Danh Sách Yêu Cầu) và CustomersPage.tsx.
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const panelFilterCount =
    (selectedCat !== 'ALL' ? 1 : 0) +
    (selectedMat !== 'ALL' ? 1 : 0) +
    (selectedSale !== 'ALL' ? 1 : 0) +
    (selectedOrder !== 'ALL' ? 1 : 0) +
    (timeRange !== 'ALL' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0);
  const isExtraFiltered = panelFilterCount > 0;

  const handleResetExtraFilters = () => {
    setSelectedCat('ALL');
    setSelectedMat('ALL');
    setSelectedSale('ALL');
    setSelectedOrder('ALL');
    setTimeRange('ALL');
    setStartDate('');
    setEndDate('');
  };

  // Debounce search 300ms
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Danh sách Sale (người tạo yêu cầu) + Order (người xử lý/báo giá) để đổ dropdown lọc trong panel
  // "Bộ lọc" — nạp 1 lần lúc mount (query /users nhẹ, không cần chờ user mở panel).
  useEffect(() => {
    getAllUsersApi()
      .then((users) => {
        const list = Array.isArray(users) ? users : [];
        setSaleStaff(list.filter((u) => u.role === 'SALE' && u.isActive));
        setOrderStaff(list.filter((u) => u.role === 'ORDER' && u.isActive));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCat, selectedMat, selectedSale, selectedOrder, sortMode, timeRange, startDate, endDate]);

  // Luôn lấy giá SỐNG (tính theo giá kim loại/đá hiện tại) — BE tự tính lại mỗi lần gọi, không
  // còn phụ thuộc nút bấm tay.
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchLibraryProducts({
        search: debouncedSearch || undefined,
        categoryId: selectedCat !== 'ALL' ? selectedCat : undefined,
        materialId: selectedMat !== 'ALL' ? selectedMat : undefined,
        salePersonId: selectedSale !== 'ALL' ? selectedSale : undefined,
        orderPersonId: selectedOrder !== 'ALL' ? selectedOrder : undefined,
        timeRange,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortMode,
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
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, selectedCat, selectedMat, selectedSale, selectedOrder, sortMode, timeRange, startDate, endDate, currentPage, pageSize]);

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
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm ..."
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

          {/* Nút Bộ Lọc — gom danh mục/chất liệu/sale/order/thời gian */}
          <div style={{ position: 'relative' }} ref={panelRef}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: panelFilterCount > 0 ? '#0f172a' : '#f8fafc',
                color: panelFilterCount > 0 ? '#ffffff' : '#334155',
                border: panelFilterCount > 0 ? '1px solid #0f172a' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc
              {panelFilterCount > 0 && (
                <span style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 900,
                  padding: '1px 6px',
                  minWidth: '16px',
                  textAlign: 'center',
                }}>
                  {panelFilterCount}
                </span>
              )}
            </button>

            {panelOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 20,
                width: '300px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}>
                {/* Category */}
                <div>
                  <label style={popoverLabelStyle}>Danh mục</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} style={popoverSelectStyle}>
                      <option value="ALL">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Material */}
                <div>
                  <label style={popoverLabelStyle}>Chất liệu</label>
                  <div style={{ position: 'relative' }}>
                    <select value={selectedMat} onChange={(e) => setSelectedMat(e.target.value)} style={popoverSelectStyle}>
                      <option value="ALL">Tất cả chất liệu</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Sale — lọc theo người tạo yêu cầu (role SALE) */}
                {saleStaff.length > 0 && (
                  <div>
                    <label style={popoverLabelStyle}>Sale</label>
                    <div style={{ position: 'relative' }}>
                      <select value={selectedSale} onChange={(e) => setSelectedSale(e.target.value)} style={popoverSelectStyle}>
                        <option value="ALL">Tất cả Sale</option>
                        {saleStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={selectArrowStyle} />
                    </div>
                  </div>
                )}

                {/* Order — lọc theo người xử lý/báo giá (role ORDER) */}
                {orderStaff.length > 0 && (
                  <div>
                    <label style={popoverLabelStyle}>Order</label>
                    <div style={{ position: 'relative' }}>
                      <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} style={popoverSelectStyle}>
                        <option value="ALL">Tất cả Order</option>
                        {orderStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={selectArrowStyle} />
                    </div>
                  </div>
                )}

                {/* Time Range */}
                <div>
                  <label style={popoverLabelStyle}>Lọc nhanh theo thời gian</label>
                  <div style={{ position: 'relative' }}>
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} style={popoverSelectStyle}>
                      <option value="ALL">Mọi thời gian</option>
                      <option value="TODAY">Hôm nay</option>
                      <option value="THIS_WEEK">Tuần này</option>
                      <option value="THIS_MONTH">Tháng này</option>
                    </select>
                    <ChevronDown size={14} style={selectArrowStyle} />
                  </div>
                </div>

                {/* Khoảng ngày tùy chọn — từ ngày → đến ngày (lọc theo ngày báo giá) */}
                <div>
                  <label style={popoverLabelStyle}>Khoảng ngày tùy chọn</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={dateInputStyle}
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Xóa lọc — cùng phía với nút Bộ lọc */}
          <button
            type="button"
            onClick={handleResetExtraFilters}
            disabled={!isExtraFiltered}
            title={isExtraFiltered ? 'Xóa tất cả bộ lọc' : 'Chưa có bộ lọc nào đang áp dụng'}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: isExtraFiltered ? '#fee2e2' : '#f8fafc',
              color: isExtraFiltered ? '#b91c1c' : '#cbd5e1',
              border: isExtraFiltered ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700,
              cursor: isExtraFiltered ? 'pointer' : 'not-allowed', opacity: isExtraFiltered ? 1 : 0.6,
            }}
          >
            <RotateCcw size={13} /> Xóa bộ lọc
          </button>
        </div>

        {/* Sort Dropdown — phải */}
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortModeLibrary)} style={selectStyle('150px')}>
          <option value="PRICE_DESC">Giá cao nhất</option>
          <option value="PRICE_ASC">Giá thấp nhất</option>
          <option value="RECENT">Mới nhất</option>
          <option value="MOST_QUOTED">Báo giá nhiều nhất</option>
        </select>
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>{error}</div>}

      {/* Product Cards Grid: 5 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
            Đang tải dữ liệu sản phẩm...
          </div>
        ) : products.length > 0 ? (
          products.map((item, idx) => {
            const rawImgUrl = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
            const imgUrl = rawImgUrl || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

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
                <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', background: '#f8fafc' }}>
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

                  <div style={{ marginTop: '1px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                      {formatPriceRange(item.priceMin, item.priceMax, displayPrice(item.option))}
                    </div>
                    {/* {item.priceMaterialMin != null && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        Giá chất liệu: {formatPriceRange(item.priceMaterialMin, item.priceMaterialMax, item.priceMaterialMin)}
                      </div>
                    )}
                    {item.priceStoneMin != null && item.priceStoneMax != null && item.priceStoneMax > 0 && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        Giá đá: {formatPriceRange(item.priceStoneMin, item.priceStoneMax, item.priceStoneMin)}
                      </div>
                    )} */}
                    {item.livePriceMin != null && item.livePriceMax != null && (
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0369a1', marginTop: '1px' }}>
                        Hôm nay ~ {formatPriceRange(item.livePriceMin, item.livePriceMax, item.livePriceMax)}
                      </div>
                    )}
                    {/* {item.livePriceMaterialMin != null && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                        Giá chất liệu: {formatPriceRange(item.livePriceMaterialMin, item.livePriceMaterialMax, item.livePriceMaterialMin)}
                      </div>
                    )}
                    {item.livePriceStoneMin != null && item.livePriceStoneMax != null && item.livePriceStoneMax > 0 && (
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                        Giá đá: {formatPriceRange(item.livePriceStoneMin, item.livePriceStoneMax, item.livePriceStoneMin)}
                      </div>
                    )} */}
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
          key={detailItem.key}
          item={detailItem}
          onClose={() => setDetailItem(null)}
          filters={{
            search: debouncedSearch || undefined,
            categoryId: selectedCat !== 'ALL' ? selectedCat : undefined,
            materialId: selectedMat !== 'ALL' ? selectedMat : undefined,
            salePersonId: selectedSale !== 'ALL' ? selectedSale : undefined,
            orderPersonId: selectedOrder !== 'ALL' ? selectedOrder : undefined,
            timeRange: timeRange !== 'ALL' ? timeRange : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }}
        />
      )}
    </div>
  );
};
