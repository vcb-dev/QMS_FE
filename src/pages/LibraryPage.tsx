import React, { useState, useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import {
  fbBtnCls,
  popoverSelectCls,
  selectArrowCls,
  popoverLabelCls,
  dateInputCls,
} from '../styles/classNames';
import { useSearchParams } from 'react-router-dom';
import type { SortModeLibrary, LibraryPageProps, TimeRange, ProductOptionCard, StaffUser } from '../types';
import { Search, SlidersHorizontal, RotateCcw, ChevronDown } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { Pagination } from '../components/Pagination';
import { ProductSpecModal } from '../components/ProductSpecModal';
import { displayPrice, formatPriceRange } from '../utils/quoteOption';
import { fetchLibraryProducts, getAllUsersApi } from '../services/api';

export const LibraryPage: React.FC<LibraryPageProps> = ({
  categories,
  materials,
  currentRole,
  initialTimeRange,
}) => {
  // Seed từ khóa ban đầu từ URL (?q=...) khi nhảy tới đây từ "Xem thêm" ở search tổng Header —
  // chỉ đọc 1 lần lúc mount, sau đó searchTerm là state nội bộ bình thường.
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
  // Đếm request để bỏ qua response trả về trễ (race condition khi đổi lọc/trang liên tục)
  const requestIdRef = useRef(0);

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
  const loadData = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;
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
      if (myRequestId !== requestIdRef.current) return;
      setProducts(res.data || []);
      setTotalItems(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
      setError(null);
    } catch (err: any) {
      if (myRequestId === requestIdRef.current) {
        setError(err.message || 'Không thể tải danh sách sản phẩm');
      }
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, selectedCat, selectedMat, selectedSale, selectedOrder, sortMode, timeRange, startDate, endDate, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-[20px] pb-[30px]">
      {/* Header Title */}
      <div className="flex justify-between items-start gap-[12px]">
        <div>
          <h1 className="text-[24px] font-black text-[#0f172a] m-0 tracking-[-0.3px]">
            {currentRole === 'SALE' ? 'Thư Viện Sản Phẩm' : 'Quản Lý Sản Phẩm'}
          </h1>
          <p className="text-[13px] text-[#64748b] mt-[4px] mb-0 mx-0">
            Xếp hạng sản phẩm đã báo giá cho khách theo giá, mốc thời gian và phân loại
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-[10px] flex-wrap">
        <div className="flex items-center gap-[10px] flex-wrap">
          {/* Search Input */}
          <div className="relative w-[260px]">
            <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-[#cbd5e1] rounded-[8px] pt-[7px] pr-[12px] pb-[7px] pl-[36px] text-[12.5px] text-[#0f172a] outline-none box-border"
            />
          </div>

          {/* Nút Bộ Lọc — gom danh mục/chất liệu/sale/order/thời gian */}
          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              className={clsx(fbBtnCls, 'inline-flex items-center gap-[6px] py-[8px] px-[14px] text-[12.5px]')}
            >
              <SlidersHorizontal size={14} />
              Bộ lọc
              {panelFilterCount > 0 && (
                <span className="bg-[#cbd5e1] text-[#0f172a] rounded-full text-[10.5px] font-black py-[1px] px-[6px] min-w-[16px] text-center">
                  {panelFilterCount}
                </span>
              )}
            </button>

            {panelOpen && (
              <div className="absolute top-[calc(100%+8px)] left-0 z-20 w-[300px] bg-surface border border-[#e2e8f0] rounded-[12px] shadow-[0_12px_32px_rgba(15,23,42,0.16)] p-[16px] flex flex-col gap-[14px]">
                {/* Category */}
                <div>
                  <label className={popoverLabelCls}>Danh mục</label>
                  <div className="relative">
                    <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)} className={popoverSelectCls}>
                      <option value="ALL">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Material */}
                <div>
                  <label className={popoverLabelCls}>Chất liệu</label>
                  <div className="relative">
                    <select value={selectedMat} onChange={(e) => setSelectedMat(e.target.value)} className={popoverSelectCls}>
                      <option value="ALL">Tất cả chất liệu</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Sale — lọc theo người tạo yêu cầu (role SALE) */}
                {saleStaff.length > 0 && (
                  <div>
                    <label className={popoverLabelCls}>Sale</label>
                    <div className="relative">
                      <select value={selectedSale} onChange={(e) => setSelectedSale(e.target.value)} className={popoverSelectCls}>
                        <option value="ALL">Tất cả Sale</option>
                        {saleStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={selectArrowCls} />
                    </div>
                  </div>
                )}

                {/* Order — lọc theo người xử lý/báo giá (role ORDER) */}
                {orderStaff.length > 0 && (
                  <div>
                    <label className={popoverLabelCls}>Order</label>
                    <div className="relative">
                      <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)} className={popoverSelectCls}>
                        <option value="ALL">Tất cả Order</option>
                        {orderStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={selectArrowCls} />
                    </div>
                  </div>
                )}

                {/* Time Range */}
                <div>
                  <label className={popoverLabelCls}>Lọc nhanh theo thời gian</label>
                  <div className="relative">
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} className={popoverSelectCls}>
                      <option value="ALL">Mọi thời gian</option>
                      <option value="TODAY">Hôm nay</option>
                      <option value="THIS_WEEK">Tuần này</option>
                      <option value="THIS_MONTH">Tháng này</option>
                    </select>
                    <ChevronDown size={14} className={selectArrowCls} />
                  </div>
                </div>

                {/* Khoảng ngày tùy chọn — từ ngày → đến ngày (lọc theo ngày báo giá) */}
                <div>
                  <label className={popoverLabelCls}>Khoảng ngày tùy chọn</label>
                  <div className="flex flex-col gap-[8px]">
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={dateInputCls}
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={dateInputCls}
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
            className={clsx(fbBtnCls, 'flex items-center gap-[4px] py-[8px] px-[14px] text-[12px] shrink-0')}
          >
            <RotateCcw size={13} /> Xóa bộ lọc
          </button>
        </div>

        {/* Sort Dropdown — phải */}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortModeLibrary)}
          className="bg-[#f8fafc] border border-[#cbd5e1] rounded-[8px] py-[7px] px-[12px] text-[12.5px] font-bold text-[#0f172a] outline-none cursor-pointer min-w-[150px]"
        >
          <option value="PRICE_DESC">Giá cao nhất</option>
          <option value="PRICE_ASC">Giá thấp nhất</option>
          <option value="RECENT">Mới nhất</option>
          <option value="MOST_QUOTED">Báo giá nhiều nhất</option>
        </select>
      </div>

      {error && <div className="text-[#dc2626] text-[13px] text-center">{error}</div>}

      {/* Product Cards Grid: 5 Columns */}
      <div className="grid grid-cols-5 gap-[16px]">
        {loading ? (
          <div className="col-span-full text-center text-[#94a3b8] p-[40px]">
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
                className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-pointer transition-[transform_0.15s_ease,box-shadow_0.15s_ease] flex flex-col hover:-translate-y-[2px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.08)]"
              >
                {/* Image Container — img absolute inset-0 để khung aspect-square giữ tỉ lệ vuông
                    bất kể ảnh gốc dọc hay ngang. */}
                <div className="relative w-full aspect-square bg-[#f8fafc]">
                  <img
                    src={imgUrl}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {(sortMode === 'PRICE_DESC' || sortMode === 'MOST_QUOTED') && (
                    <span className="absolute top-[8px] left-[8px] bg-text text-surface text-[10px] font-extrabold py-[2px] px-[8px] rounded-[10px]">
                      #{(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  )}
                  <span className="absolute top-[8px] right-[8px] bg-[rgba(15,23,42,0.75)] backdrop-blur-[4px] text-surface text-[10px] font-bold py-[2px] px-[6px] rounded-[6px] tabular-nums">
                    {item.code}
                  </span>
                </div>

                {/* Body Details */}
                <div className="p-[14px] flex flex-col gap-[5px] flex-1">
                  <div className="flex items-center gap-[6px]">
                    <h3 className="text-[13.5px] font-extrabold text-text m-0 truncate flex-1" title={item.productName}>
                      {item.productName}
                    </h3>
                    {item.duplicateCount && item.duplicateCount > 1 && (
                      <span
                        title={`Đã báo giá ${item.duplicateCount} lần cho mẫu này`}
                        className="shrink-0 text-[10px] font-extrabold text-[#0369a1] bg-[#e0f2fe] py-[2px] px-[6px] rounded-[8px]"
                      >
                        ×{item.duplicateCount}
                      </span>
                    )}
                  </div>

                  <div className="mt-[1px]">
                    <div className="text-[15px] font-black text-text">
                      {formatPriceRange(item.priceMin, item.priceMax, displayPrice(item.option))}
                    </div>
                    {/* {item.priceMaterialMin != null && (
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        Giá chất liệu: {formatPriceRange(item.priceMaterialMin, item.priceMaterialMax, item.priceMaterialMin)}
                      </div>
                    )}
                    {item.priceStoneMin != null && item.priceStoneMax != null && item.priceStoneMax > 0 && (
                      <div className="text-[11px] font-semibold text-[#64748b]">
                        Giá đá: {formatPriceRange(item.priceStoneMin, item.priceStoneMax, item.priceStoneMin)}
                      </div>
                    )} */}
                    {item.livePriceMin != null && item.livePriceMax != null && (
                      <div className="text-[11.5px] font-bold text-[#0369a1] mt-[1px]">
                        Hôm nay ~ {formatPriceRange(item.livePriceMin, item.livePriceMax, item.livePriceMax)}
                      </div>
                    )}
                    {/* {item.livePriceMaterialMin != null && (
                      <div className="text-[11px] font-semibold text-[#94a3b8]">
                        Giá chất liệu: {formatPriceRange(item.livePriceMaterialMin, item.livePriceMaterialMax, item.livePriceMaterialMin)}
                      </div>
                    )}
                    {item.livePriceStoneMin != null && item.livePriceStoneMax != null && item.livePriceStoneMax > 0 && (
                      <div className="text-[11px] font-semibold text-[#94a3b8]">
                        Giá đá: {formatPriceRange(item.livePriceStoneMin, item.livePriceStoneMax, item.livePriceStoneMin)}
                      </div>
                    )} */}
                  </div>

                  <div className="text-[11.5px] text-[#475569] mt-[4px] flex flex-col gap-[3px] leading-[1.4]">
                    <div>
                      <strong className="text-[#64748b]">Chất liệu:</strong> {item.matStr}
                    </div>
                    {item.weightDisplay && (
                      <div>
                        <strong className="text-[#64748b]">Khối lượng:</strong> <span className="font-bold text-text">{item.weightDisplay}</span>
                      </div>
                    )}
                    <div>
                      <strong className="text-[#64748b]">Đá quý:</strong> <span className={item.stoneDisplay === 'Không đính đá' ? 'text-[#94a3b8] font-medium' : 'text-text font-bold'}>{item.stoneDisplay}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center text-[#94a3b8] p-[40px]">
            Chưa có sản phẩm nào trong thư viện
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="mt-[10px] bg-surface border border-border rounded-[12px]">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={UI_CONSTANTS.PRODUCT_LIBRARY.PAGE_SIZE_OPTIONS}
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
