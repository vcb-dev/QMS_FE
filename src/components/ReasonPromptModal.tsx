import React, { useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  formGroupCls,
  formLabelCls,
  formReqCls,
  formControlCls,
  toolBtnCls,
} from '../styles/classNames';

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
    <div className={modalBackdropCls}>
      <div className={clsx(modalCardCls, '!max-w-[500px]')}>
        {/* động — giữ inline */}
        <div className={modalHeaderCls} style={{ color: headerColor }}>
          {/* động — giữ inline */}
          <h2 style={{ color: headerColor }}>{title}</h2>
          {/* động — giữ inline */}
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer" style={{ color: headerColor }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={modalBodyCls}>
            <div className={formGroupCls}>
              <label className={formLabelCls}>{label} <span className={formReqCls}>{requiredNote}</span></label>
              <textarea
                className={formControlCls}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder={placeholder}
              />
            </div>
          </div>

          <div className={modalFooterCls}>
            <button type="button" className={toolBtnCls} onClick={onClose}>Hủy</button>
            <button type="submit" className={submitButtonClassName} style={submitButtonStyle} disabled={submitting}>
              {submitIcon} {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
