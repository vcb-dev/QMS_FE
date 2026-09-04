import React from 'react';
import clsx from 'clsx';
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
    <div className="flex items-center justify-between gap-[12px] px-[14px] py-[12px] rounded-[10px] bg-white border border-[#e2e8f0]">
      <div className="flex flex-col gap-[3px]">
        <span className="text-[13.5px] font-bold text-[#0f172a]">
          {label}
        </span>
        {summary && (
          <span className="text-[11.5px] text-[#64748b] font-semibold">
            {summary}
          </span>
        )}
      </div>

      <span className="flex items-center gap-[8px] shrink-0">
        <span className="flex flex-col items-end">
          <strong
            className={clsx(
              "text-[15px] font-black",
              isFinalStatus ? "text-[#16a34a] not-italic opacity-100" : "text-[#94a3b8] italic opacity-80"
            )}
          >
            {price}
          </strong>
          {renderPriceBreakdownLines(getPriceBreakdown(opt))}
        </span>
        {!isFinalStatus && (
          <span className="text-[10px] text-[#ea580c] bg-[#fff7ed] border border-[#ffedd5] py-[1px] px-[5px] rounded-[4px] font-extrabold">
            Chưa duyệt
          </span>
        )}
        {isFinalStatus && opt.quotedPrice != null && (
          <button
            type="button"
            title={`Copy dòng chữ: "${label}: ${price}"`}
            onClick={onCopy}
            className={clsx(
              "shrink-0 flex items-center justify-center w-[26px] h-[26px] rounded-[7px] border border-[#cbd5e1] cursor-pointer",
              copied ? "bg-[#dcfce7] text-[#16a34a]" : "bg-white text-[#475569]"
            )}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </span>
    </div>
  );
};
