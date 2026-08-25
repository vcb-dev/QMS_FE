import React, { useEffect, useState } from 'react';
import { Search, Users, TrendingUp, ChevronDown, ChevronUp, MapPin, Phone } from 'lucide-react';
import { fetchCustomerStats, fetchQuoteRequests } from '../services/api';
import type { CustomerStatRow, SortMode, QuoteRequest } from '../types';
import { formatCurrency } from '../utils/currency';
import { Pagination } from '../components/Pagination';
import { STATUS_BADGE_META as STATUS_META } from '../constants';
import { StatCard } from '../components/StatCard';

export const CustomersPage: React.FC = () => {
  const [rows, setRows] = useState<CustomerStatRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalClosedValueAll, setTotalClosedValueAll] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('TOP_SPEND');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(false);

  // Lazy cache for orders per customer
  const [customerOrders, setCustomerOrders] = useState<
    Record<string, { loading: boolean; data: QuoteRequest[]; error?: string }>
  >({});

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortMode]);

  useEffect(() => {
    setLoading(true);
    fetchCustomerStats({
      search: searchTerm || undefined,
      sortMode,
      page: currentPage,
      limit: pageSize,
    })
      .then((res) => {
        setRows(res.data);
        setTotalItems(res.meta.total);
        setTotalClosedValueAll(res.totalClosedValueAll);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Không thể tải dữ liệu khách hàng'))
      .finally(() => setLoading(false));
  }, [searchTerm, sortMode, currentPage, pageSize]);

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
        <StatCard icon={<Users size={14} />} label="Tổng khách hàng" value={totalItems} />
        <StatCard icon={<TrendingUp size={14} />} label="Tổng giá trị đã chốt" value={formatCurrency(totalClosedValueAll)} tone="success" />
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo tên hoặc SĐT..."
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
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
                  padding: '7px 12px', borderRadius: '8px', border: 'none', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                  background: sortMode === opt.key ? '#0f172a' : '#f1f5f9',
                  color: sortMode === opt.key ? '#fff' : '#475569',
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
                                <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '110px 1.8fr 1fr 1fr 1fr', gap: '10px', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                                  <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{o.code || o.id}</span>
                                  <span style={{ color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.productName}</span>
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
