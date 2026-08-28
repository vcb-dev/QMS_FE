import React from 'react';
import { formatCurrency } from './currency';
import { formatPriceRange } from './quoteOption';

type BreakdownInput = {
  quotedPrice?: number | null;
  stonePrice?: number | null;
  priceBreakdown?: { material: number; stone: number };
  livePrice?: number | null;
  livePriceBreakdown?: { material: number; stone: number };
  price?: number | null; // ProductSpecModal history option dùng `price` thay `quotedPrice`
};

// Hai phần giá bán để hiển thị. Ưu tiên field priceBreakdown BE tính sẵn; đơn cũ / endpoint chưa
// kèm thì suy ra (quotedPrice|price) - (stonePrice ?? 0). null khi option chưa có giá.
export function getPriceBreakdown(opt: BreakdownInput): { material: number; stone: number } | null {
  if (opt.priceBreakdown) return opt.priceBreakdown;
  const raw = opt.quotedPrice ?? opt.price;
  if (raw === null || raw === undefined) return null;
  const total = Number(raw);
  if (!Number.isFinite(total)) return null;
  const stone = Number(opt.stonePrice) || 0;
  return { material: Math.round(total - stone), stone: Math.round(stone) };
}

export function getLivePriceBreakdown(opt: BreakdownInput): { material: number; stone: number } | null {
  if (opt.livePriceBreakdown) return opt.livePriceBreakdown;
  if (opt.livePrice === null || opt.livePrice === undefined) return null;
  const total = Number(opt.livePrice);
  if (!Number.isFinite(total)) return null;
  const stone = Number(opt.stonePrice) || 0;
  return { material: Math.round(total - stone), stone: Math.round(stone) };
}

// 2 dòng phụ nhỏ dưới con số tổng. Ẩn dòng "Giá đá" khi stone <= 0.
export function renderPriceBreakdownLines(
  bd: { material: number; stone: number } | null,
  opts?: { live?: boolean },
): React.ReactNode {
  if (!bd) return null;
  const color = opts?.live ? '#94a3b8' : '#64748b';
  const style: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color, lineHeight: '15px' };
  return (
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={style}>Giá chất liệu: {formatCurrency(bd.material)}</span>
      {bd.stone > 0 && <span style={style}>Giá đá: {formatCurrency(bd.stone)}</span>}
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
