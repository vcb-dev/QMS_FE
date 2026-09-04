import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Search, Users, TrendingUp, ChevronDown, ChevronUp, MapPin, Phone, Calendar, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { fetchCustomerStats, fetchCustomerMonthComparison, fetchQuoteRequests, fetchProvinces, getAllUsersApi } from '../services/api';
import type { CustomerStatRow, SortMode, QuoteRequest, StaffUser, CustomerMonthComparisonResponse } from '../types';
import { formatCurrency } from '../utils/currency';
import { Pagination } from '../components/Pagination';
import { STATUS_BADGE_META as STATUS_META } from '../constants';
import { StatCard } from '../components/StatCard';

// Cùng phong cách popover "Bộ lọc" như FilterBar.tsx (trang Danh Sách Yêu Cầu)
const selectArrowCls = 'absolute right-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none';
const selectCls = 'appearance-none w-full bg-page border border-[#cbd5e1] rounded-[8px] pt-[8px] pr-[30px] pb-[8px] pl-[12px] text-[12.5px] font-semibold text-[#334155] outline-none cursor-pointer box-border';
const dateInputCls = 'w-full bg-page border border-[#cbd5e1] rounded-[8px] pt-[7px] pr-[10px] pb-[7px] pl-[32px] text-[12px] font-semibold text-[#334155] outline-none box-border';
const popoverLabelCls = 'text-[10.5px] font-extrabold text-faint uppercase tracking-[0.4px] mb-[5px] block';

export const CustomersPage: React.FC = () => {
  const [rows, setRows] = useState<CustomerStatRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('TOP_SPEND');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);

  // Filter thêm: tỉnh/thành, nhân viên sale phụ trách (requesterId), mốc thời gian đơn gần nhất —
  // mặc định "Tháng này" để khớp với card so sánh KPI tháng này/tháng trước ở đầu trang.
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [saleStaff, setSaleStaff] = useState<StaffUser[]>([]);
  const [provinceFilter, setProvinceFilter] = useState('ALL');
  const [requesterFilter, setRequesterFilter] = useState('ALL');
  const [timeRangeFilter, setTimeRangeFilter] = useState('THIS_MONTH');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // So sánh KPI tháng này/tháng trước cho 2 card đầu trang — độc lập với bộ lọc bảng bên dưới,
  // chỉ theo tỉnh/thành + nhân viên sale (nếu có chọn).
  const [monthComparison, setMonthComparison] = useState<CustomerMonthComparisonResponse | null>(null);

  useEffect(() => {
    fetchCustomerMonthComparison({
      provinceId: provinceFilter !== 'ALL' ? provinceFilter : undefined,
      requesterId: requesterFilter !== 'ALL' ? requesterFilter : undefined,
    })
      .then(setMonthComparison)
      .catch(() => setMonthComparison(null));
  }, [provinceFilter, requesterFilter]);

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

  // Lazy cache for orders per customer
  const [customerOrders, setCustomerOrders] = useState<
    Record<string, { loading: boolean; data: QuoteRequest[]; error?: string }>
  >({});

  useEffect(() => {
    fetchProvinces().then((data) => {
      if (Array.isArray(data)) setProvinces(data);
    });
    getAllUsersApi()
      .then((users) => setSaleStaff(users.filter((u) => u.role === 'SALE' && u.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortMode, provinceFilter, requesterFilter, timeRangeFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    setLoading(true);
    fetchCustomerStats({
      search: searchTerm || undefined,
      sortMode,
      provinceId: provinceFilter !== 'ALL' ? provinceFilter : undefined,
      requesterId: requesterFilter !== 'ALL' ? requesterFilter : undefined,
      timeRange: timeRangeFilter !== 'ALL' ? timeRangeFilter : undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      page: currentPage,
      limit: pageSize,
    })
      .then((res) => {
        setRows(res.data);
        setTotalItems(res.meta.total);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Không thể tải dữ liệu khách hàng'))
      .finally(() => setLoading(false));
  }, [searchTerm, sortMode, provinceFilter, requesterFilter, timeRangeFilter, startDateFilter, endDateFilter, currentPage, pageSize]);

  const panelFilterCount =
    (provinceFilter !== 'ALL' ? 1 : 0) +
    (requesterFilter !== 'ALL' ? 1 : 0) +
    (timeRangeFilter !== 'ALL' ? 1 : 0) +
    (startDateFilter ? 1 : 0) +
    (endDateFilter ? 1 : 0);

  const isExtraFiltered = panelFilterCount > 0;

  const handleResetExtraFilters = () => {
    setProvinceFilter('ALL');
    setRequesterFilter('ALL');
    setTimeRangeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleToggleExpand = (customerId: string) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(customerId);

    // If orders for this customer haven't been fetched yet, fetch them lazily
    if (!customerOrders[customerId]?.data && !customerOrders[customerId]?.loading) {
      setCustomerOrders((prev) => ({
        ...prev,
        [customerId]: { loading: true, data: [] },
      }));

      fetchQuoteRequests({ customerId, limit: 100 })
        .then((res) => {
          setCustomerOrders((prev) => ({
            ...prev,
            [customerId]: { loading: false, data: res?.data || [] },
          }));
        })
        .catch((err) => {
          setCustomerOrders((prev) => ({
            ...prev,
            [customerId]: { loading: false, data: [], error: err.message || 'Lỗi khi tải danh sách đơn' },
          }));
        });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (error) {
    return <div className="p-[40px] text-center text-[#dc2626]">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <h1 className="text-[24px] font-black text-[#0f172a] m-0 tracking-[-0.3px]">
          Quản Lý Khách Hàng
        </h1>
        <p className="text-[13px] text-[#64748b] mt-[4px] mr-0 mb-0 ml-0">
          Danh sách khách hàng và lịch sử đơn báo giá
        </p>
      </div>

      <div className="grid grid-cols-2 gap-[16px]">
        <StatCard
          icon={<Users size={14} />}
          label="Khách hàng hoạt động (tháng này)"
          value={monthComparison?.current.customerCount ?? 0}
          deltaPct={monthComparison?.customerCountDeltaPct}
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Giá trị đã chốt (tháng này)"
          value={formatCurrency(monthComparison?.current.closedValue ?? 0)}
          tone="success"
          deltaPct={monthComparison?.closedValueDeltaPct}
        />
      </div>

      <div className="bg-surface border border-border rounded-[14px] p-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-[12px] flex-wrap mb-[14px]">
          <div className="flex items-center gap-[10px] flex-wrap">
            <div className="relative w-[260px]">
              <Search size={14} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên hoặc SĐT..."
                className="w-full pt-[9px] pr-[12px] pb-[9px] pl-[34px] rounded-[8px] border border-[#cbd5e1] text-[12.5px] outline-none box-border"
              />
            </div>

            {/* Nút Bộ Lọc — gom tỉnh/thành, nhân viên sale, mốc thời gian, giống FilterBar.tsx ở trang Danh Sách Yêu Cầu */}
            <div className="relative" ref={panelRef}>
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="fb-btn inline-flex items-center gap-[6px] py-[8px] px-[14px] text-[12.5px]"
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
                <div className="absolute top-[calc(100%+8px)] left-0 z-20 w-[300px] bg-surface border border-border rounded-[12px] shadow-[0_12px_32px_rgba(15,23,42,0.16)] p-[16px] flex flex-col gap-[14px]">
                  <div>
                    <label className={popoverLabelCls}>Tỉnh/thành</label>
                    <div className="relative">
                      <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className={selectCls}>
                        <option value="ALL">Tất cả tỉnh/thành</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={selectArrowCls} />
                    </div>
                  </div>

                  <div>
                    <label className={popoverLabelCls}>Nhân viên sale phụ trách</label>
                    <div className="relative">
                      <select value={requesterFilter} onChange={(e) => setRequesterFilter(e.target.value)} className={selectCls}>
                        <option value="ALL">Tất cả nhân viên sale</option>
                        {saleStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className={selectArrowCls} />
                    </div>
                  </div>

                  <div>
                    <label className={popoverLabelCls}>Lọc nhanh theo thời gian</label>
                    <div className="flex gap-[6px] flex-wrap">
                      {([
                        { value: 'TODAY', label: 'Hôm nay' },
                        { value: 'THIS_WEEK', label: 'Tuần này' },
                        { value: 'THIS_MONTH', label: 'Tháng này' },
                        { value: 'ALL', label: 'Tất cả' },
                      ] as { value: string; label: string }[]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setTimeRangeFilter(opt.value); setStartDateFilter(''); setEndDateFilter(''); }}
                          className={clsx(
                            'py-[6px] px-[12px] rounded-[6px] text-[11.5px] font-bold cursor-pointer',
                            timeRangeFilter === opt.value && !startDateFilter && !endDateFilter
                              ? 'bg-surface text-[#0f172a] border border-[#0f172a]'
                              : 'bg-[#f1f5f9] text-[#64748b] border border-transparent',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={popoverLabelCls}>Khoảng ngày tùy chọn</label>
                    <div className="flex flex-col gap-[8px]">
                      <div className="relative">
                        <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                          type="date"
                          value={startDateFilter}
                          max={endDateFilter || undefined}
                          onChange={(e) => { setStartDateFilter(e.target.value); setTimeRangeFilter('ALL'); }}
                          className={dateInputCls}
                        />
                      </div>
                      <div className="relative">
                        <Calendar size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                          type="date"
                          value={endDateFilter}
                          min={startDateFilter || undefined}
                          onChange={(e) => { setEndDateFilter(e.target.value); setTimeRangeFilter('ALL'); }}
                          className={dateInputCls}
                        />
                      </div>
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
              className="fb-btn flex items-center gap-[4px] py-[8px] px-[14px] text-[12px] shrink-0"
            >
              <RotateCcw size={13} /> Xóa bộ lọc
            </button>
          </div>

          <div className="flex gap-[6px] flex-wrap">
            {([
              { key: 'TOP_SPEND', label: 'Chi tiêu nhiều nhất' },
              { key: 'MOST_ORDERS', label: 'Nhiều đơn nhất' },
              { key: 'RECENT', label: 'Mới nhất' },
            ] as { key: SortMode; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortMode(opt.key)}
                className={clsx(
                  'py-[7px] px-[12px] rounded-[8px] text-[11.5px] font-bold cursor-pointer',
                  sortMode === opt.key
                    ? 'bg-surface text-[#0f172a] border border-[#0f172a]'
                    : 'bg-[#f1f5f9] text-[#475569] border border-transparent',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-faint text-[12.5px] py-[30px]">Đang tải...</div>
        ) : rows.length > 0 ? (
          <div className="flex flex-col gap-[8px]">
            {rows.map((s) => {
              const isExpanded = expandedId === s.customer.id;
              const orderState = customerOrders[s.customer.id];

              return (
                <div key={s.customer.id} className="border border-[#f1f5f9] rounded-[10px] overflow-hidden">
                  <div
                    onClick={() => handleToggleExpand(s.customer.id)}
                    className={clsx(
                      'grid grid-cols-[2fr_1fr_1fr_1fr_1.3fr_auto] gap-[10px] items-center py-[12px] px-[14px] cursor-pointer',
                      isExpanded ? 'bg-page' : 'bg-surface',
                    )}
                  >
                    <div>
                      <div className="font-extrabold text-[#0f172a] text-[13px]">{s.customer.name}</div>
                      <div className="flex items-center gap-[10px] mt-[2px] text-[11px] text-muted">
                        {s.customer.phone && <span className="flex items-center gap-[3px]"><Phone size={11} /> {s.customer.phone}</span>}
                        {s.customer.province && <span className="flex items-center gap-[3px]"><MapPin size={11} /> {s.customer.province.name}</span>}
                      </div>
                    </div>
                    <div className="text-[12.5px] text-[#334155]">
                      <div className="text-[10px] text-faint font-bold uppercase">Tổng đơn</div>
                      {s.totalOrders}
                    </div>
                    <div className="text-[12.5px] text-[#334155]">
                      <div className="text-[10px] text-faint font-bold uppercase">Đã chốt</div>
                      {s.totalClosed}
                    </div>
                    <div className="text-[12.5px] text-muted">
                      <div className="text-[10px] text-faint font-bold uppercase">Đơn gần nhất</div>
                      {s.lastOrder ? new Date(s.lastOrder).toLocaleDateString('vi-VN') : '---'}
                    </div>
                    <div className="text-[13px] font-black text-tone-green-text">
                      <div className="text-[10px] text-faint font-bold uppercase">Giá trị đã chốt</div>
                      {formatCurrency(s.closedValue)}
                    </div>
                    <div className="text-faint">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[#f1f5f9] py-[12px] px-[14px] bg-[#fbfcfe]">
                      {orderState?.loading ? (
                        <div className="text-center text-faint text-[12px] py-[10px]">
                          Đang tải danh sách đơn...
                        </div>
                      ) : orderState?.error ? (
                        <div className="text-center text-[#dc2626] text-[12px] py-[10px]">
                          {orderState.error}
                        </div>
                      ) : orderState?.data && orderState.data.length > 0 ? (
                        <div className="flex flex-col gap-[6px]">
                          {[...orderState.data]
                            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                            .map((o) => {
                              const meta = STATUS_META[o.status] || { label: o.status, color: '#475569', bg: '#f1f5f9' };
                              return (
                                <div key={o.id} className="grid grid-cols-[110px_1.6fr_1fr_0.9fr_1fr_1fr] gap-[10px] items-center text-[12px] py-[6px] border-b border-[#f1f5f9]">
                                  <span className="font-mono text-muted">{o.code || o.id}</span>
                                  <span className="text-[#334155] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{o.productName}</span>
                                  <span className="text-muted overflow-hidden text-ellipsis whitespace-nowrap" title={o.requester?.name || undefined}>{o.requester?.name || 'Chưa gán'}</span>
                                  <span className="text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '---'}</span>
                                  <span
                                    className="inline-flex items-center justify-center py-[2px] px-[8px] rounded-[20px] text-[10.5px] font-bold w-fit"
                                    // động — giữ inline
                                    style={{ color: meta.color, background: meta.bg }}
                                  >
                                    {meta.label}
                                  </span>
                                  <span className={clsx('font-bold', o.status === 'CLOSED' ? 'text-tone-green-text' : 'text-[#334155]')}>
                                    {o.quotedPrice ? formatCurrency(Number(o.quotedPrice)) : '---'}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center text-faint text-[12px] py-[10px]">
                          Khách hàng chưa có đơn nào
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-faint text-[12.5px] py-[30px]">Không tìm thấy khách hàng nào</div>
        )}

        {rows.length > 0 && (
          <div className="mt-[14px]">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
