import React, { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { fetchVnGoldPrice } from '../services/api';
import { formatNumberVN } from '../utils/currency';

interface VnGoldPriceItem {
  key: string;
  label: string;
  priceVnd: number;
  changeAmount: number | null;
  changePct: number | null;
}

const REFRESH_MS = 60 * 1000;

// Nhãn bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính giá tham khảo, chỉ ẩn khỏi UI
const cleanLabel = (label: string) => label.replace(/\s*\(Áp dụng[^)]*\)/i, '').trim();

export const VnGoldPriceTicker: React.FC = () => {
  const [items, setItems] = useState<VnGoldPriceItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetchVnGoldPrice()
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setUpdatedAt(data?.updatedAt || null);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '14px',
        padding: '18px 22px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Giá Vàng Thị Trường
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', fontWeight: 800, color: '#4ade80', letterSpacing: '0.5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'livePulse 1.4s ease-in-out infinite' }} />
            TRỰC TIẾP
          </span>
          <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.4)' }}>
            (chỉ tham khảo, không dùng để tính giá)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {updatedAt && (
            <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.5)' }}>
              {new Date(updatedAt).toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            title="Tải lại"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '26px', height: '26px', borderRadius: '7px',
              border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, flexShrink: 0,
            }}
          >
            <RefreshCw size={12} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>
      </div>

      {error && <div style={{ fontSize: '11.5px', color: '#fca5a5' }}> {error}</div>}
      {!error && items.length === 0 && (
        <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>Đang tải giá vàng thị trường...</div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0' }}>
          {items.map((it, idx) => {
            const isUp = (it.changePct ?? 0) > 0;
            const isDown = (it.changePct ?? 0) < 0;
            const color = isUp ? '#4ade80' : isDown ? '#f87171' : 'rgba(255,255,255,0.4)';
            const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

            return (
              <div
                key={it.key}
                style={{
                  padding: '10px 16px',
                  borderLeft: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>
                  {cleanLabel(it.label)}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff', marginTop: '4px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatNumberVN(it.priceVnd)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11.5px', fontWeight: 800, color }}>
                  <Icon size={12} />
                  {it.changePct === null ? '—' : `${isUp ? '+' : ''}${it.changePct}%`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
