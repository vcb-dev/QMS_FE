import type { QuoteRequest, Role, User } from '../types';
import {
  Printer,
  Edit3,
  Check,
  Plus,
  Info,
} from 'lucide-react';
import { UI_CONSTANTS } from '../constants';

interface InspectorProps {
  selectedReq: QuoteRequest | null;
  currentRole: Role;
  currentUser: User;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
  onResubmit?: (id: string) => void;
  onSelectOption?: (reqId: string, optionId: string) => void;
}

export const Inspector: React.FC<InspectorProps> = ({
  selectedReq,
  currentRole,
  onEdit,
  onPricing,
}) => {
  if (!selectedReq) {
    return (
      <aside className="inspector" style={{ width: '360px', background: '#ffffff', borderLeft: '1px solid #e2e8f0', padding: '20px' }}>
        <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '60px' }}>
          📌 Chọn một bản ghi để xem Chi tiết yêu cầu
        </div>
      </aside>
    );
  }

  const priceVal = selectedReq.quotedPrice ? Number(selectedReq.quotedPrice) : 0;
  const vatVal = selectedReq.vat ? Number(selectedReq.vat) : 8;
  const priceBeforeVat = priceVal > 0 ? (vatVal > 0 ? priceVal / (1 + vatVal / 100) : priceVal) : 281250000;
  const totalAmount = priceVal > 0 ? priceVal : 303750000;

  const formattedTotal = totalAmount.toLocaleString('vi-VN');
  const formattedBeforeVat = Math.round(priceBeforeVat).toLocaleString('vi-VN');
  const formattedVat = Math.round(totalAmount - priceBeforeVat).toLocaleString('vi-VN');

  const imageUrl = selectedReq.images && selectedReq.images.length > 0
    ? selectedReq.images[0].imageUrl
    : UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

  return (
    <aside
      className="inspector"
      style={{
        width: '380px',
        minWidth: '380px',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 1. Header Title & Top Action Buttons */}
      <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {selectedReq.code || `#RQ-${selectedReq.id}`}
          </h2>
          <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
            {selectedReq.status === 'XONG' ? 'Hoàn tất' : 'Đang Xử Lý'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            style={{
              flex: 1,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <Printer size={13} /> In Báo Giá
          </button>

          {(currentRole === 'SALE' || currentRole === 'ADMIN') && (
            <button
              type="button"
              onClick={() => onEdit(selectedReq)}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Edit3 size={13} /> Chỉnh Sửa
            </button>
          )}

          {(currentRole === 'ORDER' || currentRole === 'ADMIN') && (
            <button
              type="button"
              onClick={() => onPricing(selectedReq.id)}
              style={{
                flex: 1,
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <Check size={13} /> Hoàn Tất
            </button>
          )}
        </div>
      </div>

      {/* 2. Product Image Preview */}
      <div style={{ position: 'relative', width: '100%', height: '170px', borderRadius: '12px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <img
          src={imageUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', display: 'flex', gap: '6px' }}>
          <span style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
            18K White Gold
          </span>
          <span style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>
            Size 12
          </span>
        </div>
      </div>

      {/* 3. Product Title & Spec Cards */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
          {selectedReq.productName || 'Nhẫn Cưới Kim Cương Hoàng Gia (Custom)'}
        </h3>
        <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
          Thiết kế độc bản theo yêu cầu khách hàng. Yêu cầu độ tinh khiết VVS1, nước màu D, giác cắt Excellent.
        </p>

        {/* 3 Grid Metric Specs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>DANH MỤC</span>
            <strong style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px', display: 'block' }}>{selectedReq.category?.name || 'Nhẫn Nữ'}</strong>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>TRỌNG LƯỢNG</span>
            <strong style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px', display: 'block' }}>3.5 Chỉ</strong>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>ĐÁ CHÍNH</span>
            <strong style={{ fontSize: '11px', color: '#0f172a', marginTop: '2px', display: 'block' }}>1.5 CT, D</strong>
          </div>
        </div>
      </div>

      {/* 4. Inspiration Attachments */}
      <div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
          Tài Liệu Đính Kèm (Inspiration)
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <img src={imageUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
          <img src={imageUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
          <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <Plus size={16} />
            <span style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>Thêm Ảnh</span>
          </div>
        </div>
      </div>

      {/* 5. Thông Tin Đơn Yêu Cầu */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
          Thông Tin Đơn Yêu Cầu
        </span>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Khách Hàng:</span>
          <strong style={{ color: '#0f172a' }}>{selectedReq.customerName || selectedReq.customer?.name || 'Trần Thị Bích Ngọc'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Nhân Viên Bán Hàng:</span>
          <strong style={{ color: '#334155' }}>{selectedReq.requester?.name || 'Nguyễn Văn A (Store Q1)'}</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Hạn Chót Báo Giá:</span>
          <strong style={{ color: '#e11d48' }}>26/10/2023 (Còn 2 ngày)</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Nơi Nhận Hàng:</span>
          <span style={{ fontWeight: 600, color: '#334155', textAlign: 'right' }}>Chi nhánh Flagship Đồng Khởi, Q1</span>
        </div>
      </div>

      {/* 6. Chi Tiết Báo Giá (Dự Kiến) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
            Chi Tiết Báo Giá (Dự Kiến)
          </span>
          <Info size={14} color="#94a3b8" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Vàng 18K (Trắng)</span>
            <span style={{ fontWeight: 700 }}>15,750,000 đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Kim Cương Chủ (1.5 CT)</span>
            <span style={{ fontWeight: 700 }}>245,000,000 đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Kim Cương Tấm (Pavé)</span>
            <span style={{ fontWeight: 700 }}>12,500,000 đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b' }}>Chi Phí Gia Công (Bậc 3)</span>
            <span style={{ fontWeight: 700 }}>8,000,000 đ</span>
          </div>

          <div style={{ borderTop: '1px dashed #e2e8f0', margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>Tạm Tính:</span>
            <span>{formattedBeforeVat} đ</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>Thuế VAT ({vatVal}%):</span>
            <span>{formattedVat} đ</span>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block' }}>TỔNG CỘNG BÁO GIÁ</span>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
              {formattedTotal} đ
            </div>
          </div>
        </div>
      </div>

      {/* 7. Ghi Chú Nội Bộ */}
      <div>
        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
          Ghi Chú Nội Bộ
        </span>
        <textarea
          rows={3}
          placeholder="Thêm ghi chú cho bộ phận xưởng hoặc người duyệt..."
          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', background: '#f8fafc' }}
        />
      </div>
    </aside>
  );
};

