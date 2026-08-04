import React, { useState } from 'react';
import { X, DollarSign, Calculator } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: number, vat: number) => Promise<void>;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [basePrice, setBasePrice] = useState('');
  const [vat, setVat] = useState('10');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const basePriceVal = parseFloat(basePrice) || 0;
  const vatVal = parseFloat(vat) || 0;

  // Realtime Tax Calculation (Base Price + VAT = Total Customer Price)
  const vatAmount = basePriceVal * (vatVal / 100);
  const totalCustomerPrice = basePriceVal + vatAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!basePriceVal || basePriceVal <= 0) {
      alert('Vui lòng nhập giá sản phẩm hợp lệ!');
      return;
    }

    setSubmitting(true);
    try {
      // Pass the final total price (including VAT) to the backend API
      await onSubmit(totalCustomerPrice, vatVal);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chốt giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e1b4b, #31103f)' }}>
          <h2>💰 Báo Giá Sản Phẩm Chế Tác</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Giá Sản Phẩm / Chưa VAT (VND) <span className="req">*</span></label>
              <input
                type="number"
                className="form-control"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Ví dụ: 5000000"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cộng Thuế VAT (%)</label>
              <input
                type="number"
                className="form-control"
                value={vat}
                onChange={(e) => setVat(e.target.value)}
                placeholder="10"
              />
            </div>

            {/* Live Tax Addition Breakdown Card */}
            {basePriceVal > 0 && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 700, fontSize: '13px' }}>
                  <Calculator size={16} /> Bảng Tính Chi Tiết Thuế VAT
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#64748b' }}>Giá Sản Phẩm Gốc (Chưa VAT):</span>
                  <strong style={{ color: '#0f172a' }}>{Math.round(basePriceVal).toLocaleString('vi-VN')} ₫</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#64748b' }}>Cộng Thuế VAT (+{vatVal}%):</span>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>+ {Math.round(vatAmount).toLocaleString('vi-VN')} ₫</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13.5px',
                  borderTop: '1px stroke #e2e8f0',
                  paddingTop: '8px',
                  background: '#f0fdf4',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                }}>
                  <span style={{ color: '#166534', fontWeight: 700 }}>Tổng Giá Báo Khách (Có VAT):</span>
                  <strong style={{ color: '#15803d', fontSize: '15px' }}>{Math.round(totalCustomerPrice).toLocaleString('vi-VN')} ₫</strong>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-insp btn-insp-primary" style={{ background: '#10b981' }} disabled={submitting}>
              <DollarSign size={16} /> Xác Nhận Chốt Giá
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
