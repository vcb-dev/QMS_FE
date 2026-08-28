import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ReasonPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  headerColor: string;
  title: string;
  label: string;
  requiredNote: string;
  placeholder: string;
  validationMsg: string;
  errorFallbackMsg: string;
  submitButtonClassName: string;
  submitButtonStyle?: React.CSSProperties;
  submitIcon: React.ReactNode;
  submitLabel: string;
}

// Modal "nhập lý do bắt buộc rồi xác nhận" dùng chung — RejectModal (từ chối) và ReturnModal (trả
// lại Sale bổ sung) trước đây là 2 file gần như byte-identical, chỉ khác màu/chữ/label.
export const ReasonPromptModal: React.FC<ReasonPromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  headerColor,
  title,
  label,
  requiredNote,
  placeholder,
  validationMsg,
  errorFallbackMsg,
  submitButtonClassName,
  submitButtonStyle,
  submitIcon,
  submitLabel,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert(validationMsg);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err: any) {
      alert(err.message || errorFallbackMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header" style={{ background: '#ffffff', color: headerColor }}>
          <h2 style={{ color: headerColor }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: headerColor, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">{label} <span className="req">{requiredNote}</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder={placeholder}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className={submitButtonClassName} style={submitButtonStyle} disabled={submitting}>
              {submitIcon} {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
