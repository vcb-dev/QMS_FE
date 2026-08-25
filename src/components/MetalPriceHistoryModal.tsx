import React, { useEffect, useState } from 'react';
import { X, History, ArrowUp, ArrowDown } from 'lucide-react';
import { fetchBaseMetalHistory } from '../services/api';
import type { BaseMetalPriceHistoryItem } from '../types';
import { formatCurrency } from '../utils/currency';

interface MetalPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetalPriceHistoryModal: React.FC<MetalPriceHistoryModalProps> = ({ isOpen, onClose }) => {
  const [rows, setRows] = useState<BaseMetalPriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchBaseMetalHistory()
      .then((data: BaseMetalPriceHistoryItem[]) => setRows(Array.isArray(data) ? data : []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '640px' }}>
        <div className="modal-header" style={{ background: '#0c1542' }}>
          <h2><History size={18} style={{ verticalAlign: '-3px', marginRight: '6px' }} />Lịch Sử Giá Kim Loại</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && <p style={{ fontSize: '12.5px', color: '#64748b' }}>Đang tải...</p>}
          {error && <p style={{ fontSize: '12.5px', color: '#dc2626' }}>{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <p style={{ fontSize: '12.5px', color: '#94a3b8' }}>Chưa có lịch sử thay đổi giá.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0',
                }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{r.baseMetalName}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {new Date(r.createdAt).toLocaleString('vi-VN')} · {r.updatedByName || 'Hệ thống'}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {r.changePct != null && r.changePct !== 0 && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11.5px', fontWeight: 700,
                      color: r.changePct > 0 ? '#16a34a' : '#dc2626',
                    }}>
                      {r.changePct > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                      {Math.abs(r.changePct)}%
                    </span>
                  )}
                  <strong style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                    {formatCurrency(r.priceVnd)}
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="tool-btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};
