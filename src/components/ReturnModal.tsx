import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('BẮT BUỘC nhập lý do trả lại để Sale biết đường bổ sung!');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi trả lại yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header" style={{ background: '#ea580c' }}>
          <h2>Trả Lại Yêu Cầu Cho Sale (Cần Bổ Sung)</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Lý do trả lại bổ sung thông tin <span className="req">* (Bắt buộc)</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Nhập lý do cần bổ sung (ví dụ: Ảnh mờ không rõ kiểu chấu đính đá, thiếu kích thước nhẫn...)..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-insp btn-insp-primary" style={{ background: '#ea580c' }} disabled={submitting}>
              <RotateCcw size={16} /> Trả Lại Cho Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
