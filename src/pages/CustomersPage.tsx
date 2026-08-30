import React, { useEffect, useRef, useState } from 'react';
import { Search, Users, TrendingUp, ChevronDown, ChevronUp, MapPin, Phone, Calendar, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { fetchCustomerStats, fetchCustomerMonthComparison, fetchQuoteRequests, fetchProvinces, getAllUsersApi } from '../services/api';
import type { CustomerStatRow, SortMode, QuoteRequest, StaffUser, CustomerMonthComparisonResponse } from '../types';
import { formatCurrency } from '../utils/currency';
import { Pagination } from '../components/Pagination';
import { STATUS_BADGE_META as STATUS_META } from '../constants';
import { StatCard } from '../components/StatCard';

// Cùng phong cách popover "Bộ lọc" như FilterBar.tsx (trang Danh Sách Yêu Cầu) — style trùng tên
// nhưng khai báo riêng ở đây vì FilterBar không export ra ngoài.
const selectArrowStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  pointerEvents: 'none',
};

const selectStyle: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '8px 30px 8px 12px',
  fontSize: '12.5px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const dateInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 10px 7px 32px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  boxSizing: 'border-box',
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
    return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Quản Lý Khách Hàng
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
          Danh sách khách hàng và lịch sử đơn báo giá
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên hoặc SĐT..."
                style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Nút Bộ Lọc — gom tỉnh/thành, nhân viên sale, mốc thời gian, giống FilterBar.tsx ở trang Danh Sách Yêu Cầu */}
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="fb-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                }}
              >
                <SlidersHorizontal size={14} />
                Bộ lọc
                {panelFilterCount > 0 && (
                  <span style={{
                    background: '#cbd5e1',
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
                  <div>
                    <label style={popoverLabelStyle}>Tỉnh/thành</label>
                    <div style={{ position: 'relative' }}>
                      <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} style={selectStyle}>
                        <option value="ALL">Tất cả tỉnh/thành</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={selectArrowStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={popoverLabelStyle}>Nhân viên sale phụ trách</label>
                    <div style={{ position: 'relative' }}>
                      <select value={requesterFilter} onChange={(e) => setRequesterFilter(e.target.value)} style={selectStyle}>
                        <option value="ALL">Tất cả nhân viên sale</option>
                        {saleStaff.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} style={selectArrowStyle} />
                    </div>
                  </div>

                  <div>
                    <label style={popoverLabelStyle}>Lọc nhanh theo thời gian</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: timeRangeFilter === opt.value && !startDateFilter && !endDateFilter ? '#ffffff' : '#f1f5f9',
                            color: timeRangeFilter === opt.value && !startDateFilter && !endDateFilter ? '#0f172a' : '#64748b',
                            border: timeRangeFilter === opt.value && !startDateFilter && !endDateFilter ? '1px solid #0f172a' : '1px solid transparent',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={popoverLabelStyle}>Khoảng ngày tùy chọn</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ position: 'relative' }}>
                        <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                        <input
                          type="date"
                          value={startDateFilter}
                          max={endDateFilter || undefined}
                          onChange={(e) => { setStartDateFilter(e.target.value); setTimeRangeFilter('ALL'); }}
                          style={dateInputStyle}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Calendar size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                        <input
                          type="date"
                          value={endDateFilter}
                          min={startDateFilter || undefined}
                          onChange={(e) => { setEndDateFilter(e.target.value); setTimeRangeFilter('ALL'); }}
                          style={dateInputStyle}
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
              className="fb-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '8px 14px', fontSize: '12px', flexShrink: 0,
              }}
            >
              <RotateCcw size={13} /> Xóa bộ lọc
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {([
              { key: 'TOP_SPEND', label: 'Chi tiêu nhiều nhất' },
              { key: 'MOST_ORDERS', label: 'Nhiều đơn nhất' },
              { key: 'RECENT', label: 'Mới nhất' },
            ] as { key: SortMode; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortMode(opt.key)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                  background: sortMode === opt.key ? '#ffffff' : '#f1f5f9',
                  color: sortMode === opt.key ? '#0f172a' : '#475569',
                  border: sortMode === opt.key ? '1px solid #0f172a' : '1px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '30px 0' }}>Đang tải...</div>
        ) : rows.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rows.map((s) => {
              const isExpanded = expandedId === s.customer.id;
              const orderState = customerOrders[s.customer.id];

              return (
                <div key={s.customer.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => handleToggleExpand(s.customer.id)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.3fr auto', gap: '10px', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#ffffff' }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{s.customer.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                        {s.customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={11} /> {s.customer.phone}</span>}
                        {s.customer.province && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={11} /> {s.customer.province.name}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Tổng đơn</div>
                      {s.totalOrders}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Đã chốt</div>
                      {s.totalClosed}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Đơn gần nhất</div>
                      {s.lastOrder ? new Date(s.lastOrder).toLocaleDateString('vi-VN') : '---'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: '#15803d' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Giá trị đã chốt</div>
                      {formatCurrency(s.closedValue)}
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 14px', background: '#fbfcfe' }}>
                      {orderState?.loading ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '10px 0' }}>
                          Đang tải danh sách đơn...
                        </div>
                      ) : orderState?.error ? (
                        <div style={{ textAlign: 'center', color: '#dc2626', fontSize: '12px', padding: '10px 0' }}>
                          {orderState.error}
                        </div>
                      ) : orderState?.data && orderState.data.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {[...orderState.data]
                            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                            .map((o) => {
                              const meta = STATUS_META[o.status] || { label: o.status, color: '#475569', bg: '#f1f5f9' };
                              return (
                                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '110px 1.6fr 1fr 0.9fr 1fr 1fr', gap: '10px', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{o.code || o.id}</span>
                                  <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</span>
                                  <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.requester?.name || undefined}>{o.requester?.name || 'Chưa gán'}</span>
                                  <span style={{ color: '#64748b' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '---'}</span>
                                  <span
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      padding: '2px 8px', borderRadius: '20px', fontSize: '10.5px', fontWeight: 700,
                                      color: meta.color, background: meta.bg, width: 'fit-content',
                                    }}
                                  >
                                    {meta.label}
                                  </span>
                                  <span style={{ fontWeight: 700, color: o.status === 'CLOSED' ? '#15803d' : '#334155' }}>
                                    {o.quotedPrice ? formatCurrency(Number(o.quotedPrice)) : '---'}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '10px 0' }}>
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
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '30px 0' }}>Không tìm thấy khách hàng nào</div>
        )}

        {rows.length > 0 && (
          <div style={{ marginTop: '14px' }}>
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
