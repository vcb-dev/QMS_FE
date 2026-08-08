import React from 'react';
import type { QuoteRequest, Role } from '../types';
import { LayoutDashboard, ArrowRight, Package, FilePlus, Clock, CheckCircle, XCircle, RotateCcw, PlusCircle } from 'lucide-react';
import { UI_CONSTANTS } from '../constants';

interface DashboardViewProps {
  requests: QuoteRequest[];
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    needMoreInfo: number;
    xong: number;
    tuChoi: number;
  };
  currentRole: Role;
  onSelectReq: (id: string) => void;
  onViewAll: () => void;
  onOpenLibrary: () => void;
  onOpenCreateModal?: () => void;
  onFilterChange?: (filter: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests,
  counts,
  currentRole,
  onSelectReq,
  onViewAll,
  onOpenLibrary,
  onOpenCreateModal,
  onFilterChange,
}) => {
  // Overdue count estimation (status is YC_MOI or DANG_XLY)
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
        <div>
          {(currentRole === 'SALE' || currentRole === 'ADMIN') && onOpenCreateModal && (
            <button className="primary-action" onClick={onOpenCreateModal} style={{ padding: '8px 18px', fontSize: '13px' }}>
              <PlusCircle size={18} /> Tạo Yêu Cầu Báo Giá
            </button>
          )}
        </div>
      </div>

      {/* 2. Top 4 Metric Summary Cards - Exact Design & Clickable Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {/* Yêu cầu mới */}
        <div
          onClick={() => onFilterChange ? onFilterChange('YC_MOI') : onViewAll()}
          style={{
            background: '#edf5ff',
            border: '1px solid #d0e3ff',
            borderRadius: '14px',
            padding: '18px 22px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
          }}
          className="metric-card-hover"
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Yêu cầu mới
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#1e3a8a' }}>
            {counts.ycMoi}
          </div>
        </div>

        {/* Đang xử lý */}
        <div
          onClick={() => onFilterChange ? onFilterChange('DANG_XLY') : onViewAll()}
          style={{
            background: '#f3e8ff',
            border: '1px solid #e9d5ff',
            borderRadius: '14px',
            padding: '18px 22px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 8px rgba(126, 34, 206, 0.05)',
          }}
          className="metric-card-hover"
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Đang xử lý
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#581c87' }}>
            {counts.dangXly}
          </div>
        </div>

        {/* Sắp quá hạn */}
        <div
          onClick={() => onViewAll()}
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '14px',
            padding: '18px 22px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.05)',
          }}
          className="metric-card-hover"
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Sắp quá hạn
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#78350f' }}>
            {overdueCount}
          </div>
        </div>

        {/* Hoàn thành */}
        <div
          onClick={() => onFilterChange ? onFilterChange('XONG') : onViewAll()}
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '14px',
            padding: '18px 22px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.05)',
          }}
          className="metric-card-hover"
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
            Hoàn thành
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#064e3b' }}>
            {counts.xong}
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Recent Requests Table */}
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

        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', width: '130px' }}>MÃ</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SẢN PHẨM</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', width: '130px' }}>TRẠNG THÁI</th>
                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', width: '140px' }}>NGƯỜI XỬ LÝ</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length > 0 ? (
                recentRequests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectReq(r.id)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#2563eb', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {r.code || r.id}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                      {r.productName}
                    </td>
                    <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>{getStatusPill(r.status)}</td>
                    <td style={{ padding: '12px', color: '#475569', fontWeight: 600, fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                      {r.pricer?.name || r.requester?.name || '---'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
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

        {/* Gallery Cards Grid: Fixed 4 columns per row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
          {completedProducts.length > 0 ? (
            completedProducts.slice(0, 4).map((r) => {
              const rawImg = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
              const imgUrl = rawImg || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

              const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
              const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' ₫' : 'Đã báo giá';

              const matStr = r.materials && r.materials.length > 0
                ? r.materials.map((m) => m.name).join(', ')
                : r.material ? r.material.name : '';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectReq(r.id)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  className="product-card-hover"
                >
                  <div style={{ position: 'relative', width: '100%', height: '140px', background: '#f8fafc' }}>
                    <img
                      src={imgUrl}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {r.category?.name && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          backdropFilter: 'blur(4px)',
                          zIndex: 2,
                        }}
                      >
                        {r.category.name}
                      </span>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: '#ffffff',
                        color: '#2563eb',
                        fontSize: '10px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        zIndex: 2,
                      }}
                    >
                      {r.code || r.id}
                    </span>
                  </div>

                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.productName}
                    </div>

                    <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#64748b' }}>Chất liệu:</span>
                      <span style={{ fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        {matStr || '---'}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ fontWeight: 600, color: '#d97706' }}>📏 Số đo:</span> {r.customerMeasurements || '---'}
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#166534', letterSpacing: '0.3px' }}>BÁO GIÁ:</span>
                      <span style={{ fontSize: '15px', fontWeight: 900, color: '#16a34a' }}>
                        {formattedPrice}
                      </span>
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
