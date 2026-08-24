// Nhãn bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính giá, chỉ ẩn khỏi UI/copy
export const stripAppliedPct = (s: string) => (s || '').replace(/\s*\(Áp dụng[^)]*\)/gi, '').trim();

export const cleanOptionLabel = (opt: { materialName?: string; optionName: string }) =>
  stripAppliedPct(opt.materialName || opt.optionName || '');

// Giá hiển thị trên Quản Lý Sản Phẩm ưu tiên livePrice (tính theo giá kim loại/đá/tỷ lệ/VAT hôm
// nay) — chỉ fallback về quotedPrice đã đóng băng khi BE không tính được (thiếu config).
export const displayPrice = (opt: { quotedPrice: number; livePrice?: number | null }) =>
  opt.livePrice != null ? Number(opt.livePrice) : Number(opt.quotedPrice) || 0;
