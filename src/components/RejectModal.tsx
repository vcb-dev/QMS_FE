import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Theo đặc tả: BẮT BUỘC phải nhập lý do từ chối!');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi từ chối yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header" style={{ background: '#be123c' }}>
          <h2>❌ Từ Chối Yêu Cầu Báo Giá</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Lý do từ chối <span className="req">* (Bắt buộc theo đặc tả)</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do không thể báo giá (ví dụ: Thiếu thông tin số đo, xưởng hết phôi gỗ...)..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-insp btn-insp-danger" disabled={submitting}>
              <XCircle size={16} /> ❌ Xác Nhận Từ Chối
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
