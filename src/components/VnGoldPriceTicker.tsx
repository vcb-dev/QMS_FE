import React, { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { fetchVnGoldPrice } from '../services/api';
import { formatNumberVN } from '../utils/currency';
import { PRICING_DEFAULTS } from '../constants';

interface VnGoldPriceItem {
  key: string;
  label: string;
  priceVnd: number;
  changeAmount: number | null;
  changePct: number | null;
}

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
    const timer = setInterval(load, PRICING_DEFAULTS.REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="bg-surface border border-border rounded-[14px] py-[18px] px-[22px] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-[14px] gap-[10px] flex-wrap">
        <div className="flex items-center gap-[10px] flex-wrap">
          <span className="text-[12.5px] font-black text-[#d97706] uppercase tracking-[0.6px]">
            Giá Vàng Thị Trường
          </span>
          <span className="inline-flex items-center gap-[5px] text-[9.5px] font-extrabold text-[#16a34a] tracking-[0.5px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#16a34a] animate-[livePulse_1.4s_ease-in-out_infinite]" />
            TRỰC TIẾP
          </span>
          <span className="text-[10.5px] text-[#94a3b8]">
            (chỉ tham khảo, không dùng để tính giá)
          </span>
        </div>
        <div className="flex items-center gap-[10px]">
          {updatedAt && (
            <span className="text-[10.5px] text-[#94a3b8]">
              {new Date(updatedAt).toLocaleTimeString('vi-VN')}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            title="Tải lại"
            className={clsx(
              'flex items-center justify-center w-[26px] h-[26px] rounded-[7px] border border-[#cbd5e1] bg-[#f1f5f9] text-[#334155] shrink-0',
              loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100',
            )}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="text-[11.5px] text-[#dc2626]"> {error}</div>}
      {!error && items.length === 0 && (
        <div className="text-[11.5px] text-[#94a3b8]">Đang tải giá vàng thị trường...</div>
      )}

      {items.length > 0 && (
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-0">
          {items.map((it, idx) => {
            const isUp = (it.changePct ?? 0) > 0;
            const isDown = (it.changePct ?? 0) < 0;
            const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

            return (
              <div
                key={it.key}
                className={clsx(
                  'py-[10px] px-[16px]',
                  idx === 0 ? 'border-l-0' : 'border-l border-[#e2e8f0]',
                )}
              >
                <div className="text-[11px] font-bold text-[#64748b] whitespace-nowrap tracking-[0.2px]">
                  {cleanLabel(it.label)}
                </div>
                <div className="text-[20px] font-black text-[#0f172a] mt-[4px] [font-variant-numeric:tabular-nums] whitespace-nowrap">
                  {formatNumberVN(it.priceVnd)} <span className="text-[12px] font-bold text-[#64748b] ml-[2px]">VNĐ</span>
                </div>
                <div
                  className={clsx(
                    'flex items-center gap-[4px] mt-[4px] text-[11.5px] font-extrabold',
                    isUp ? 'text-[#16a34a]' : isDown ? 'text-[#dc2626]' : 'text-[#94a3b8]',
                  )}
                >
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
