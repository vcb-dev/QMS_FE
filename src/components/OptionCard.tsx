import React from 'react';
import { Check, Copy } from 'lucide-react';
import type { QuoteOption } from '../types';
import { formatCurrency } from '../utils/currency';
import { getOptionLabel, getOptionSummary } from '../utils/quoteOption';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';

interface OptionCardProps {
  opt: QuoteOption;
  idx: number;
  isFinalStatus: boolean;
  copied: boolean;
  onCopy: () => void;
}

// 1 dòng trong danh sách "Các Phương Án Báo Giá" của DetailPage — tách riêng vì thân hàm .map() gốc
// dài ~70 dòng, chỉ đọc từ opt/idx/isFinalStatus/copied nên tách được không cần đổi logic.
export const OptionCard: React.FC<OptionCardProps> = ({ opt, idx, isFinalStatus, copied, onCopy }) => {
  const price = opt.quotedPrice ? formatCurrency(Number(opt.quotedPrice)) : '---';
  const label = getOptionLabel(opt, idx);
  const summary = getOptionSummary(opt);

  return (
    <div
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
          {label}
        </span>
        {summary && (
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
            {summary}
          </span>
        )}
      </div>

      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <strong
            style={{
              fontSize: '15px',
              fontWeight: 900,
              color: isFinalStatus ? '#16a34a' : '#94a3b8',
              fontStyle: isFinalStatus ? 'normal' : 'italic',
              opacity: isFinalStatus ? 1 : 0.8,
            }}
          >
            {price}
          </strong>
          {renderPriceBreakdownLines(getPriceBreakdown(opt))}
        </span>
        {!isFinalStatus && (
          <span style={{ fontSize: '10px', color: '#ea580c', background: '#fff7ed', border: '1px solid #ffedd5', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
            Chưa duyệt
          </span>
        )}
        {isFinalStatus && opt.quotedPrice != null && (
          <button
            type="button"
            title={`Copy dòng chữ: "${label}: ${price}"`}
            onClick={onCopy}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: copied ? '#dcfce7' : '#ffffff',
              color: copied ? '#16a34a' : '#475569',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </span>
    </div>
  );
};
