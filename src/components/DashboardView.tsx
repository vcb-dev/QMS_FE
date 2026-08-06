import React from 'react';
import type { QuoteRequest, Role } from '../types';
import { LayoutDashboard, ArrowRight, Package, FilePlus, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface DashboardViewProps {
  requests: QuoteRequest[];
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    xong: number;
    tuChoi: number;
  };
  currentRole: Role;
  onSelectReq: (id: string) => void;
  onViewAll: () => void;
  onOpenLibrary: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  counts,
  currentRole,
  onSelectReq,
  onViewAll,
  onOpenLibrary,
}) => {
  // Overdue count estimation (e.g., status is YC_MOI or DANG_XLY)
  const overdueCount = requests.filter((r) => r.status === 'YC_MOI' || r.status === 'DANG_XLY').length;
  const recentRequests = requests.slice(0, 5);
  const completedProducts = requests.filter((r) => r.status === 'XONG' || r.quotedPrice);

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'YC_MOI':
        return <span className="status-pill new"><FilePlus size={13} color="#1d4ed8" /> Yêu cầu mới</span>;
      case 'DANG_XLY':
        return <span className="status-pill process"><Clock size={13} color="#b45309" /> Đang xử lý</span>;
      case 'XONG':
        return <span className="status-pill done"><CheckCircle size={13} color="#15803d" /> Đã báo giá</span>;
      case 'TU_CHOI':
        return <span className="status-pill reject"><XCircle size={13} color="#be123c" /> Từ chối</span>;
      case 'NEED_MORE_INFO':
        return <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}><RotateCcw size={13} color="#ea580c" /> Cần bổ sung</span>;
      default:
        return <span className="status-pill new">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px' }}>
            01. DASHBOARD
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
            Tổng quan {currentRole === 'PRICING' ? 'Pricing' : currentRole === 'ADMIN' ? 'Admin' : 'Sale'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="tool-btn"
            style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => alert('Chức năng Kanban Board đang được cập nhật!')}
          >
            Mở Kanban
          </button>
          <button
            type="button"
            className="tool-btn"
            style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
            onClick={() => alert('Chức năng Báo cáo KPI đang được cập nhật!')}
          >
            KPI
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {/* Yêu cầu mới */}
        <div style={{ background: '#edf5ff', border: '1px solid #d0e3ff', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Yêu cầu mới
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e3a8a' }}>
            {counts.ycMoi}
          </div>
        </div>

        {/* Đang xử lý */}
        <div style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Đang xử lý
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#581c87' }}>
            {counts.dangXly}
          </div>
        </div>

        {/* Sắp quá hạn */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Sắp quá hạn
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#78350f' }}>
            {overdueCount}
          </div>
        </div>

        {/* Hoàn thành */}
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Hoàn thành
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#064e3b' }}>
            {counts.xong}
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Recent Requests Table (Full Width - Removed Realtime Notification Box) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutDashboard size={18} color="#2563eb" /> Yêu cầu gần đây
          </h2>
          <button
            type="button"
            onClick={onViewAll}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Xem tất cả <ArrowRight size={13} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="quote-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>MÃ</th>
                <th>SẢN PHẨM</th>
                <th>TRẠNG THÁI</th>
                <th>NGƯỜI XỬ LÝ</th>
                <th>HẠN</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length > 0 ? (
                recentRequests.map((r) => (
                  <tr key={r.id} onClick={() => onSelectReq(r.id)}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                      {r.code || r.id}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                      {r.productName}
                    </td>
                    <td>{getStatusPill(r.status)}</td>
                    <td style={{ color: '#475569', fontWeight: 600 }}>
                      {r.pricer?.name || r.requester?.name || '---'}
                    </td>
                    <td style={{ color: '#d97706', fontWeight: 700 }}>
                      {r.desiredLeadTime || (r.desiredDate ? new Date(r.desiredDate).toLocaleDateString('vi-VN') : '---')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                    Chưa có yêu cầu nào gần đây
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Section: Sản phẩm báo giá gần đây */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="#16a34a" /> Sản phẩm báo giá gần đây
          </h2>
          <button
            type="button"
            onClick={onOpenLibrary}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Mở thư viện <ArrowRight size={13} />
          </button>
        </div>

        {/* Gallery Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {completedProducts.length > 0 ? (
            completedProducts.slice(0, 4).map((r) => {
              const imgUrl = r.images && r.images.length > 0
                ? r.images[0].imageUrl
                : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36';

              const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
              const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' ₫' : 'Đã báo giá';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectReq(r.id)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={r.productName}
                    style={{ width: '100%', height: '130px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', fontFamily: 'monospace' }}>
                      {r.code || r.id}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '2px 0 4px 0' }}>
                      {r.productName}
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16a34a' }}>
                      {formattedPrice}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              Chưa có sản phẩm nào được báo giá gần đây
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
