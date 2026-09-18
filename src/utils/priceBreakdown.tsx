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
  const lineCls = `text-[14px] font-semibold leading-[15px] ${opts?.live ? 'text-[#334155]' : 'text-[#334155]'}`;
  return (
    <span className="flex flex-col">
      <span className={lineCls}>Giá chất liệu: {formatCurrency(bd.material)}</span>
      {bd.stone > 0 && <span className={lineCls}>Giá đá: {formatCurrency(bd.stone)}</span>}
    </span>
  );
}

type CostBreakdownInput = {
  metalRawCost?: number | null;
  laborCost?: number | null;
  stoneCost?: number | null;
};

// Giá vốn (kim loại gốc / công chế tác / đá gốc) — BE tính sẵn từng field riêng, FE chỉ đọc và
// hiện từng dòng, KHÔNG cộng gộp thành 1 số (tránh trùng công thức với BE). Chỉ nơi gọi hàm này
// giới hạn theo role ORDER/ADMIN (PricingModal chỉ 2 role đó mở được).
export function getCostBreakdown(opt: CostBreakdownInput): CostBreakdownInput | null {
  if (opt.metalRawCost == null) return null;
  return opt;
}

export function renderCostBreakdownLines(bd: CostBreakdownInput | null): React.ReactNode {
  if (!bd || bd.metalRawCost == null) return null;
  const lineCls = 'text-[13.5px] font-semibold leading-[15px] text-[#b45309]';
  return (
    <span className="flex flex-col mt-[2px]">
      <span className={lineCls}>Vốn kim loại: {formatCurrency(bd.metalRawCost)}</span>
      {!!bd.laborCost && <span className={lineCls}>Công chế tác: {formatCurrency(bd.laborCost)}</span>}
      {!!bd.stoneCost && <span className={lineCls}>Vốn đá: {formatCurrency(bd.stoneCost)}</span>}
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
