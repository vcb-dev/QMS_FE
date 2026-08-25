import React from 'react';
import { X, Trash2 } from 'lucide-react';
import type { QuoteOption } from '../types';
import { formatCurrency } from '../utils/currency';
import { getOptionLabel, getOptionSummary } from '../utils/quoteOption';

interface ManageOptionsModalProps {
  isOpen: boolean;
  reqCode?: string;
  options: QuoteOption[];
  onClose: () => void;
  onDelete: (optionId: string) => void;
}

export const ManageOptionsModal: React.FC<ManageOptionsModalProps> = ({ isOpen, reqCode, options, onClose, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header" style={{ background: '#334155' }}>
          <h2>Quản Lý Phương Án Báo Giá{reqCode ? ` — ${reqCode}` : ''}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 12px 0' }}>
            Xóa bớt phương án nháp không cần dùng nữa — luôn phải giữ lại ít nhất 1 phương án.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt, idx) => {
              const label = getOptionLabel(opt, idx);
              const summary = getOptionSummary(opt);
              const canDelete = !!opt.id && options.length > 1;

              return (
                <div
                  key={opt.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <strong style={{ fontSize: '14px', fontWeight: 900, color: '#334155' }}>
                      {formatCurrency(Number(opt.quotedPrice))}
                    </strong>
                    <button
                      type="button"
                      title={canDelete ? 'Xóa phương án này' : 'Không thể xóa phương án cuối cùng'}
                      disabled={!canDelete}
                      onClick={() => {
                        if (opt.id && confirm(`Xóa "${label}" khỏi danh sách đề xuất?`)) {
                          onDelete(opt.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        border: '1px solid #fecdd3',
                        background: '#ffffff',
                        color: '#be123c',
                        cursor: canDelete ? 'pointer' : 'not-allowed',
                        opacity: canDelete ? 1 : 0.4,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-insp btn-insp-primary" style={{ background: '#334155' }} onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
