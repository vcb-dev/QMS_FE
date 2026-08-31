import type { QuoteOption } from '../types';
import type { CalculateBatchResultItem } from '../services/api';
import { formatCurrency } from './currency';
import { getPriceBreakdown } from './priceBreakdown';

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

// Phương án "đại diện" của 1 yêu cầu khi cần đúng 1 option: ưu tiên CLOSED (khách
// chốt), rồi SELECTED (giá chính), rồi option có giá mới nhất, rồi option đầu.
// Khớp pickPrimaryOption phía BE (option-mapper.util.ts).
export const getPrimaryOption = (req: { options?: QuoteOption[] | null }): QuoteOption | null => {
  const options = req.options ?? [];
  if (options.length === 0) return null;
  return (
    options.find((o) => o.selectionStatus === 'CLOSED') ??
    options.find((o) => o.selectionStatus === 'SELECTED') ??
    [...options].filter((o) => o.quotedPrice != null).pop() ??
    options[0] ??
    null
  );
};


// Kiểu tối thiểu để copy 1 dòng giá — phủ cả QuoteOption (Calculator/DetailPage) và
// QuoteHistoryOption của Thư Viện (`price`/`livePrice`/`livePriceBreakdown`).
type CopyLineOption = {
  optionName?: string;
  materialName?: string;
  quotedPrice?: number;
  price?: number;
  livePrice?: number | null;
  priceBreakdown?: { material: number; stone: number } | null;
  livePriceBreakdown?: { material: number; stone: number } | null;
};

// 1 dòng text để copy giá 1 phương án: "<nhãn>: <giá> (Giá chất liệu: … · Giá đá: …)".
// Hậu tố breakdown chỉ hiện khi phần đá > 0. useLive = dùng giá "sống" (Thư Viện).
export const formatOptionCopyLine = (
  opt: CopyLineOption,
  { useLive = false }: { useLive?: boolean } = {},
): string => {
  const price = useLive
    ? (opt.livePrice ?? opt.price ?? opt.quotedPrice)
    : (opt.price ?? opt.quotedPrice);
  const bd = useLive
    ? getPriceBreakdown({ priceBreakdown: opt.livePriceBreakdown })
    : getPriceBreakdown({ priceBreakdown: opt.priceBreakdown });
  const suffix = bd && bd.stone > 0
    ? ` (Giá chất liệu: ${formatCurrency(bd.material)} · Giá đá: ${formatCurrency(bd.stone)})`
    : '';
  return `${cleanOptionLabel({ optionName: opt.optionName ?? '', materialName: opt.materialName })}: ${formatCurrency(price)}${suffix}`;
};

// Chuyển 1 kết quả /quote-options/calculate-batch (BE) thành QuoteOption để hiển thị.
// priceBreakdown lấy thẳng materialPrice/stonePrice do BE trả — KHÔNG tính hiệu.
// Trả null khi kết quả lỗi hoặc quotedPrice không hợp lệ (<= 0).
export const batchResultToOption = (input: {
  optionName: string;
  materialName: string;
  materialId?: string;
  weightChi: number;
  res: CalculateBatchResultItem | undefined;
  vat: number;
  locked: boolean;
  groupId?: string;
  stones?: { stoneId: string; quantity: number }[];
  stoneDescription?: string;
  note?: string;
}): QuoteOption | null => {
  const { res } = input;
  if (!res || res.error || typeof res.quotedPrice !== 'number' || !(res.quotedPrice > 0)) {
    return null;
  }
  return {
    optionName: input.optionName,
    materialName: input.materialName,
    weightChi: input.weightChi,
    laborCost: res.laborCost,
    stoneCost: res.stoneCost,
    totalMetalCost: res.totalMetalCost,
    metalRawCost: res.metalRawCost,
    stonePrice: res.stonePrice,
    vat: input.vat,
    quotedPrice: res.quotedPrice,
    isSelected: false,
    locked: input.locked,
    groupId: input.groupId,
    priceBreakdown:
      res.materialPrice != null
        ? { material: res.materialPrice, stone: res.stonePrice ?? 0 }
        : undefined,
    materials: input.materialId
      ? [{ materialId: input.materialId, weightChi: input.weightChi }]
      : undefined,
    stones: input.stones,
    stoneDescription: input.stoneDescription,
    note: input.note,
  };
};

