// Nhãn bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính giá, chỉ ẩn khỏi UI/copy
export const stripAppliedPct = (s: string) => (s || '').replace(/\s*\(Áp dụng[^)]*\)/gi, '').trim();

export const cleanOptionLabel = (opt: { materialName?: string; optionName: string }) =>
  stripAppliedPct(opt.materialName || opt.optionName || '');
