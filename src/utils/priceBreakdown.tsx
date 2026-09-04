import React from 'react';
import { formatCurrency } from './currency';
import { formatPriceRange } from './quoteOption';

type BreakdownInput = {
  priceBreakdown?: { material: number; stone: number } | null;
  livePriceBreakdown?: { material: number; stone: number } | null;
};

// Hai phần giá bán (chất liệu / đá) để hiển thị — BE tính sẵn và trả về trong `priceBreakdown`.
// FE chỉ đọc, KHÔNG tự suy ra. null khi option chưa có giá / BE chưa kèm.
export function getPriceBreakdown(opt: BreakdownInput): { material: number; stone: number } | null {
  return opt.priceBreakdown ?? null;
}

export function getLivePriceBreakdown(opt: BreakdownInput): { material: number; stone: number } | null {
  return opt.livePriceBreakdown ?? null;
}

// 2 dòng phụ nhỏ dưới con số tổng. Ẩn dòng "Giá đá" khi stone <= 0.
export function renderPriceBreakdownLines(
  bd: { material: number; stone: number } | null,
  opts?: { live?: boolean },
): React.ReactNode {
  if (!bd) return null;
  const lineCls = `text-[11px] font-semibold leading-[15px] ${opts?.live ? 'text-[#94a3b8]' : 'text-[#64748b]'}`;
  return (
    <span className="flex flex-col">
      <span className={lineCls}>Giá chất liệu: {formatCurrency(bd.material)}</span>
      {bd.stone > 0 && <span className={lineCls}>Giá đá: {formatCurrency(bd.stone)}</span>}
    </span>
  );
}

// Khoảng giá 1 phần (chất liệu hoặc đá) ở Thư Viện — dùng lại logic formatPriceRange.
export function formatBreakdownRange(
  min: number | null | undefined,
  max: number | null | undefined,
  fallback: number,
): string {
  return formatPriceRange(min, max, fallback);
}
