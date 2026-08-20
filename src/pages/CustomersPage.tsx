import React, { useEffect, useMemo, useState } from 'react';
import { Search, Users, TrendingUp, ChevronDown, ChevronUp, MapPin, Phone } from 'lucide-react';
import { searchCustomers, fetchQuoteRequests } from '../services/api';
import type { QuoteRequest, Customer, SortMode } from '../types';
import { formatCurrency } from '../utils/currency';
import { Pagination } from '../components/Pagination';
import { STATUS_BADGE_META as STATUS_META } from '../constants';


export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('TOP_SPEND');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      searchCustomers(),
      fetchQuoteRequests({ timeRange: 'ALL', limit: 1000, lite: true }),
    ])
      .then(([customerList, quoteRes]) => {
        setCustomers(customerList || []);
        setQuoteRequests(quoteRes?.data || []);
        setError(null);
      })
      .catch((err) => setError(err.message || 'Không thể tải dữ liệu khách hàng'))
      .finally(() => setLoading(false));
  }, []);

  const customerStats = useMemo(() => {
    const map = new Map<string, QuoteRequest[]>();
    quoteRequests.forEach((r) => {
      const cid = r.customerId;
      if (!cid) return;
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid)!.push(r);
    });

    return customers.map((c) => {
      const orders = map.get(c.id) || [];
      const closedOrders = orders.filter((o) => o.status === 'CLOSED');
      const closedValue = closedOrders.reduce((sum, o) => sum + (o.quotedPrice ? Number(o.quotedPrice) : 0), 0);
      const lastOrder = orders.reduce<string | null>((latest, o) => {
        if (!o.createdAt) return latest;
        if (!latest || new Date(o.createdAt) > new Date(latest)) return o.createdAt;
        return latest;
      }, null);

      return {
        customer: c,
        orders,
        totalOrders: orders.length,
        totalClosed: closedOrders.length,
        closedValue,
        lastOrder,
      };
    });
  }, [customers, quoteRequests]);

  const filteredSorted = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    let list = customerStats.filter((s) => {
      if (!query) return true;
      return s.customer.name.toLowerCase().includes(query) || (s.customer.phone || '').includes(query);
    });

    list = [...list].sort((a, b) => {
      if (sortMode === 'TOP_SPEND') return b.closedValue - a.closedValue;
      if (sortMode === 'MOST_ORDERS') return b.totalOrders - a.totalOrders;
      // RECENT — khách có đơn gần nhất lên đầu, khách chưa có đơn xuống cuối
      if (!a.lastOrder && !b.lastOrder) return 0;
      if (!a.lastOrder) return 1;
      if (!b.lastOrder) return -1;
      return new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime();
    });

    return list;
  }, [customerStats, searchTerm, sortMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pagedList = filteredSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalClosedValueAll = customerStats.reduce((sum, s) => sum + s.closedValue, 0);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu khách hàng...</div>;
  }
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
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            <Users size={14} /> Tổng khách hàng
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{customers.length}</div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
            <TrendingUp size={14} /> Tổng giá trị đã chốt
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '6px' }}>{formatCurrency(totalClosedValueAll)}</div>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

        {filteredSorted.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pagedList.map((s) => {
              const isExpanded = expandedId === s.customer.id;
              return (
                <div key={s.customer.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : s.customer.id)}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.3fr auto', gap: '10px', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#ffffff' }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{s.customer.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                        {s.customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={11} /> {s.customer.phone}</span>}
                        {s.customer.province && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={11} /> {s.customer.province}</span>}
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
                      {s.orders.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {[...s.orders]
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
                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '10px 0' }}>Khách hàng chưa có đơn nào</div>
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

        {filteredSorted.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredSorted.length}
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
