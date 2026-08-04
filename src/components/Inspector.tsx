import React from 'react';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Zap, DollarSign, XCircle, CheckCircle, UserCheck, Package, Receipt } from 'lucide-react';

interface InspectorProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedReq,
  currentRole,
  currentUser,
  onEdit,
  onAccept,
  onPricing,
  onReject,
}) => {
  if (!selectedReq) {
    return (
      <aside className="inspector">
        <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '60px' }}>
          📌 Chọn một bản ghi trên bảng để xem chi tiết
        </div>
      </aside>
    );
  }

  const isMyReq =
    selectedReq.createdBy?.id === currentUser.id ||
    selectedReq.requester?.id === currentUser.id ||
    selectedReq.requester?.email === currentUser.email;

  const materialsList = selectedReq.materials && selectedReq.materials.length > 0
    ? selectedReq.materials.map((m) => m.name).join(', ')
    : selectedReq.material ? selectedReq.material.name : '---';

  const priceVal = selectedReq.quotedPrice ? Number(selectedReq.quotedPrice) : 0;
  const vatVal = selectedReq.vat ? Number(selectedReq.vat) : 0;
  const priceBeforeVat = priceVal > 0 ? (vatVal > 0 ? priceVal / (1 + vatVal / 100) : priceVal) : 0;

  const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' ₫' : 'Chưa có';
  const formattedBeforeVat = priceBeforeVat > 0 ? Math.round(priceBeforeVat).toLocaleString('vi-VN') + ' ₫' : 'Chưa có';

  const imageUrl = selectedReq.images && selectedReq.images.length > 0
    ? selectedReq.images[0].imageUrl
    : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36';

  const renderStatusBadge = () => {
    switch (selectedReq.status) {
      case 'YC_MOI':
        return <span className="status-pill new">🔵 YC MỚI</span>;
      case 'DANG_XLY':
        return <span className="status-pill process">🟡 ĐANG XỬ LÝ</span>;
      case 'XONG':
        return <span className="status-pill done">🟢 ĐÃ BÁO GIÁ</span>;
      case 'TU_CHOI':
        return <span className="status-pill reject">🔴 TỪ CHỐI</span>;
      default:
        return <span className="status-pill new">{selectedReq.status}</span>;
    }
  };

  return (
    <aside className="inspector" style={{ overflowY: 'auto', paddingRight: '12px' }}>
      {/* Product Image & Title Header */}
      <img src={imageUrl} className="inspector-media" alt="Ảnh Sản Phẩm" />

      <div className="inspector-title" style={{ marginBottom: '16px' }}>
        <span className="eyebrow" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {selectedReq.code || selectedReq.id}
        </span>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px 0' }}>
          {selectedReq.productName}
        </h2>
        {renderStatusBadge()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* GROUP 1: Customer & Requester Information */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <UserCheck size={14} color="#2563eb" /> THÔNG TIN KHÁCH HÀNG & NGUỒN TẠO
          </div>
          <dl className="summary-list" style={{ margin: 0 }}>
            <div className="summary-row">
              <dt>Khách Hàng:</dt>
              <dd><strong style={{ color: '#0f172a' }}>{selectedReq.customer?.name || selectedReq.requester?.name || '---'}</strong></dd>
            </div>
            <div className="summary-row">
              <dt>Tài Khoản Tạo:</dt>
              <dd>
                {selectedReq.requester?.name || '---'}
                {isMyReq && (
                  <span style={{ marginLeft: '6px', fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    Tôi
                  </span>
                )}
              </dd>
            </div>
            <div className="summary-row">
              <dt>Phòng Ban:</dt>
              <dd><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{selectedReq.requester?.department?.name || '---'}</span></dd>
            </div>
          </dl>
        </div>

        {/* GROUP 2: Product Specifications & Requirement Details */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <Package size={14} color="#d97706" /> QUY CÁCH SẢN PHẨM & YÊU CẦU
          </div>
          <dl className="summary-list" style={{ margin: 0 }}>
            <div className="summary-row">
              <dt>Tên SP & Yêu Cầu:</dt>
              <dd style={{ color: '#0f172a', fontWeight: 700 }}>{selectedReq.productName || '---'}</dd>
            </div>
            <div className="summary-row">
              <dt>Chất Liệu:</dt>
              <dd><strong style={{ color: '#334155' }}>{materialsList}</strong></dd>
            </div>
            <div className="summary-row">
              <dt>Danh Mục:</dt>
              <dd>{selectedReq.category?.name || '---'}</dd>
            </div>
            <div className="summary-row">
              <dt>Số Đo / Kích Thước:</dt>
              <dd style={{ fontWeight: 700 }}>{selectedReq.customerMeasurements || '---'}</dd>
            </div>
            <div className="summary-row">
              <dt>Thời Gian Khách Muốn Nhận:</dt>
              <dd style={{ color: '#d97706', fontWeight: 700 }}>
                {selectedReq.desiredLeadTime || (selectedReq.desiredDate ? new Date(selectedReq.desiredDate).toLocaleDateString('vi-VN') : '---')}
              </dd>
            </div>
          </dl>
        </div>

        {/* GROUP 3: Pricing & Financial Information */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '8px', borderBottom: '1px solid #bbf7d0', paddingBottom: '6px' }}>
            <Receipt size={14} color="#16a34a" /> CHI TIẾT BÁO GIÁ & TÍNH THUẾ
          </div>
          <dl className="summary-list" style={{ margin: 0 }}>
            <div className="summary-row">
              <dt>Giá SP (Chưa VAT):</dt>
              <dd style={{ color: '#15803d', fontWeight: 800 }}>{formattedBeforeVat}</dd>
            </div>
            <div className="summary-row">
              <dt>Cộng Thuế VAT:</dt>
              <dd style={{ fontWeight: 700 }}>{selectedReq.vat ? `${selectedReq.vat}%` : '---'}</dd>
            </div>
            <div className="summary-row" style={{ paddingTop: '4px', borderTop: '1px stroke #bbf7d0' }}>
              <dt style={{ color: '#0f766e', fontWeight: 800 }}>Tổng Báo Khách:</dt>
              <dd style={{ color: '#0f766e', fontWeight: 900, fontSize: '14px' }}>{formattedPrice}</dd>
            </div>
            <div className="summary-row">
              <dt>Người Báo Giá:</dt>
              <dd><strong>{selectedReq.pricer?.name || 'Chưa phân công'}</strong></dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Buttons Box */}
      <div id="inspActionBox" style={{ marginTop: '16px' }}>
        {selectedReq.status === 'XONG' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '10px', borderRadius: '8px', textAlign: 'center', color: '#15803d', fontWeight: 700, fontSize: '12.5px' }}>
            <CheckCircle size={16} /> Báo giá hoàn tất ({formattedPrice})
          </div>
        )}

        {selectedReq.status === 'TU_CHOI' && (
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '10px', borderRadius: '8px', color: '#be123c', fontSize: '12px' }}>
            <b><XCircle size={14} /> Đã từ chối:</b> {selectedReq.rejectReason || 'Không đủ điều kiện'}
          </div>
        )}

        {currentRole === 'SALE' && selectedReq.status === 'YC_MOI' && (
          <>
            {isMyReq ? (
              <>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', color: '#1e40af', fontSize: '12px', marginBottom: '8px' }}>
                  🔔 Yêu cầu <b>chưa được tiếp nhận</b> — Bạn có thể chỉnh sửa yêu cầu này.
                </div>
                <button className="btn-insp btn-insp-primary" style={{ background: '#2563eb' }} onClick={() => onEdit(selectedReq)}>
                  <Edit size={14} /> ✏️ Sửa Yêu Cầu
                </button>
              </>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '12px' }}>
                🔔 Yêu cầu của <b>{selectedReq.requester?.name || 'Sale khác'}</b> — Đang chờ bộ phận Báo giá tiếp nhận.
              </div>
            )}
          </>
        )}

        {currentRole === 'SALE' && selectedReq.status === 'DANG_XLY' && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', color: '#1e40af', fontSize: '12.5px' }}>
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#1d4ed8' }}>🟡 Đang xử lý bởi người báo giá</strong>
            <div style={{ marginTop: '6px', color: '#1e293b' }}>
              <b>Mail người báo giá:</b><br />
              <a href={`mailto:${selectedReq.pricer?.email || 'pricing@vcb.vn'}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'underline', fontSize: '13px' }}>
                📧 {selectedReq.pricer?.email || 'pricing@vcb.vn'}
              </a>
            </div>
          </div>
        )}

        {/* PRICING Role Buttons */}
        {(currentRole === 'PRICING' || currentRole === 'ADMIN') && selectedReq.status === 'YC_MOI' && (
          <>
            <button className="btn-insp btn-insp-primary" style={{ background: '#f59e0b' }} onClick={() => onAccept(selectedReq.id, selectedReq.version)}>
              ⚡ Tiếp Nhận Yêu Cầu
            </button>
            <button className="btn-insp btn-insp-danger" style={{ marginTop: '6px' }} onClick={() => onReject(selectedReq.id)}>
              ❌ Từ Chối Ngay
            </button>
          </>
        )}

        {(currentRole === 'PRICING' || currentRole === 'ADMIN') && selectedReq.status === 'DANG_XLY' && (
          <>
            <button className="btn-insp btn-insp-primary" onClick={() => onPricing(selectedReq.id)}>
              <DollarSign size={14} /> 💰 Báo Giá Sản Phẩm
            </button>
            <button className="btn-insp btn-insp-danger" style={{ marginTop: '6px' }} onClick={() => onReject(selectedReq.id)}>
              <XCircle size={14} /> ❌ Từ Chối Yêu Cầu
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
