import type { QuoteOption } from '../types';
import { formatCurrency } from './currency';

// Nhãn bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính giá, chỉ ẩn khỏi UI/copy
export const stripAppliedPct = (s: string) => (s || '').replace(/\s*\(Áp dụng[^)]*\)/gi, '').trim();

export const cleanOptionLabel = (opt: { materialName?: string; optionName: string }) =>
  stripAppliedPct(opt.materialName || opt.optionName || '');

// Giá hiển thị trên Quản Lý Sản Phẩm ưu tiên livePrice (tính theo giá kim loại/đá/tỷ lệ/VAT hôm
// nay) — chỉ fallback về quotedPrice đã đóng băng khi BE không tính được (thiếu config).
export const displayPrice = (opt: { quotedPrice: number; livePrice?: number | null }) =>
  opt.livePrice != null ? Number(opt.livePrice) : Number(opt.quotedPrice) || 0;

// Thẻ Thư Viện Sản Phẩm gộp nhiều option (khác tuổi vàng/khối lượng) — hiện khoảng giá min–max của
// nhóm; bằng nhau (nhóm 1 option) thì 1 số; thiếu min/max thì rơi về giá đại diện.
export const formatPriceRange = (
  min: number | null | undefined,
  max: number | null | undefined,
  fallback: number,
): string => {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (lo <= 0 && hi <= 0) return fallback > 0 ? formatCurrency(fallback) : 'Chưa có giá';
  if (lo > 0 && hi > 0 && Math.abs(hi - lo) > 1) {
    return `${formatCurrency(lo)} – ${formatCurrency(hi)}`;
  }
  return formatCurrency(hi || lo);
};

// Nhãn hiển thị 1 phương án — chỉ mỗi tên "Phương án N" không đủ để Sale phân biệt các option,
// ưu tiên materialName/optionName đã dọn "(Áp dụng X%)", cuối cùng mới rơi về số thứ tự.
export const getOptionLabel = (opt: QuoteOption, idx: number): string =>
  cleanOptionLabel(opt) || stripAppliedPct(opt.optionName) || `Phương án ${idx + 1}`;

// Dòng tóm tắt "Chất liệu: X · KL: Y · Đá: Z" dưới nhãn phương án — dùng chung ở OptionCard,
// MarkClosedModal, ManageOptionsModal (trước đây 3 nơi tự tính riêng cùng 1 logic).
export const getOptionSummary = (opt: QuoteOption): string => {
  const optMaterial =
    opt.materials && opt.materials.length > 0
      ? opt.materials.map((m) => m.materialName || m.material?.name).filter(Boolean).join(', ')
      : opt.materialName || '';

  const optWeight = opt.weightChi != null && Number(opt.weightChi) > 0 ? `${opt.weightChi} chỉ` : null;

  let optStones = '';
  if (opt.stones && opt.stones.length > 0) {
    optStones = opt.stones.map((s) => `${s.quantity}v ${s.stoneName || s.stone?.name || 'đá'}`).join(', ');
  } else if (opt.stoneDescription) {
    optStones = opt.stoneDescription;
  } else if (opt.stoneCost && Number(opt.stoneCost) > 0) {
    optStones = `Đá ${formatCurrency(Number(opt.stoneCost))}`;
  }

  return [
    optMaterial ? `Chất liệu: ${optMaterial}` : '',
    optWeight ? `KL: ${optWeight}` : '',
    optStones ? `Đá: ${optStones}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};
