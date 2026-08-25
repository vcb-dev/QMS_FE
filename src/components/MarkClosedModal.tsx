import React, { useEffect, useState } from 'react';
import { X, Award, Check } from 'lucide-react';
import type { QuoteOption } from '../types';
import { formatCurrency } from '../utils/currency';
import { getOptionLabel, getOptionSummary } from '../utils/quoteOption';

interface MarkClosedModalProps {
  isOpen: boolean;
  reqCode?: string;
  options: QuoteOption[];
  onClose: () => void;
  onSubmit: (optionId: string) => Promise<void>;
}

export const MarkClosedModal: React.FC<MarkClosedModalProps> = ({ isOpen, reqCode, options, onClose, onSubmit }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset lựa chọn mỗi lần mở lại popup (kể cả khi mở cho 1 yêu cầu khác)
  useEffect(() => {
    if (isOpen) setSelectedId(null);
  }, [isOpen, reqCode]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId) {
      alert('Chọn 1 phương án khách đã đồng ý mua trước khi xác nhận.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(selectedId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header" style={{ background: '#0c1542' }}>
          <h2>Chọn Phương Án Khách Đã Chốt{reqCode ? ` — ${reqCode}` : ''}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 12px 0' }}>
            Yêu cầu này có {options.length} phương án đã báo giá — chọn đúng phương án khách đồng ý mua trước khi đánh dấu Đã Chốt.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt, idx) => {
              const label = getOptionLabel(opt, idx);
              const summary = getOptionSummary(opt);
              const isChosen = opt.id === selectedId;

              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onClick={() => opt.id && setSelectedId(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: isChosen ? '#f5f3ff' : '#ffffff',
                    border: isChosen ? '1.5px solid #6d28d9' : '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{label}</span>
                    {summary && (
                      <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                        {summary}
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <strong style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a' }}>
                      {formatCurrency(Number(opt.quotedPrice))}
                    </strong>
                    {isChosen && <Check size={16} color="#6d28d9" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
          <button
            type="button"
            className="btn-insp btn-insp-primary"
            style={{ background: '#07063f' }}
            onClick={handleConfirm}
            disabled={submitting || !selectedId}
          >
            <Award size={16} /> Xác Nhận Đã Chốt
          </button>
        </div>
      </div>
    </div>
  );
};
