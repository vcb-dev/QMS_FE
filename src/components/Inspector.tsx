import React from 'react';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Zap, DollarSign, XCircle, CheckCircle } from 'lucide-react';

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
        <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
          Chọn một bản ghi để xem chi tiết
        </p>
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

  return (
    <aside className="inspector">
      <img src={imageUrl} className="inspector-media" alt="Ảnh Sản Phẩm" />
      <div className="inspector-title">
        <span className="eyebrow">{selectedReq.code || selectedReq.id}</span>
        <h2>{selectedReq.productName}</h2>
        <span className="status-pill process">{selectedReq.status}</span>
      </div>

      <dl className="summary-list">
        <div className="summary-row">
          <dt>Khách Hàng:</dt>
          <dd>{selectedReq.customer?.name || selectedReq.requester?.name || '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Người Tạo YC:</dt>
          <dd>
            {selectedReq.requester?.name || '---'}
            {isMyReq && <span style={{ marginLeft: '4px', fontSize: '10px', background: '#e0e7ff', color: '#3730a3', padding: '1px 4px', borderRadius: '4px' }}>Tôi</span>}
          </dd>
        </div>
        <div className="summary-row">
          <dt>Bộ Phận:</dt>
          <dd>{selectedReq.requester?.department?.name || '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Danh Mục:</dt>
          <dd>{selectedReq.category?.name || '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Chất Liệu:</dt>
          <dd>{materialsList}</dd>
        </div>
        <div className="summary-row">
          <dt>Số Đo:</dt>
          <dd>{selectedReq.customerMeasurements || '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Yêu Cầu / Nhận:</dt>
          <dd>{selectedReq.requestNote || '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Giá SP (Chưa VAT):</dt>
          <dd style={{ color: '#15803d', fontWeight: 800 }}>{formattedBeforeVat}</dd>
        </div>
        <div className="summary-row">
          <dt>Cộng Thuế VAT:</dt>
          <dd>{selectedReq.vat ? `${selectedReq.vat}%` : '---'}</dd>
        </div>
        <div className="summary-row">
          <dt>Tổng Báo Khách (Có VAT):</dt>
          <dd style={{ color: '#0f766e', fontWeight: 800 }}>{formattedPrice}</dd>
        </div>
        <div className="summary-row">
          <dt>Pricing:</dt>
          <dd>{selectedReq.pricer?.name || 'Chưa phân công'}</dd>
        </div>
      </dl>

      <div id="inspActionBox">
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
              <Zap size={14} /> ⚡ Tiếp Nhận Yêu Cầu
            </button>
            <button className="btn-insp btn-insp-danger" style={{ marginTop: '6px' }} onClick={() => onReject(selectedReq.id)}>
              <XCircle size={14} /> ❌ Từ Chối Ngay
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
