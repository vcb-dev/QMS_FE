import type { MaterialRow, QuoteOption, StoneRow } from '../types';

interface QuickOptionInput {
  optionName: string;
  price: number;
  vat: number;
  groupId: string;
  // Chất liệu/đá đang nằm trong máy tính của PricingModal (effect mở modal nạp từ yêu cầu của Sale).
  materialRows: MaterialRow[];
  stoneRows: StoneRow[];
  stoneMode: 'catalog' | 'manual';
  manualStoneName: string;
  manualStonePrice: string;
}

// Phương án "báo giá nhanh": Order gõ thẳng tổng tiền, không chạy công thức. Vẫn mang theo chất liệu/đá
// Sale đã yêu cầu — BE xóa hết & tạo lại options theo payload, nên option nhanh không kèm chúng thì đơn
// mất chất liệu (danh sách và trang chi tiết lấy chất liệu từ phương án đại diện).
export function buildQuickOption(input: QuickOptionInput): QuoteOption {
  const validMaterialRows = input.materialRows.filter(
    (m) => m.materialId && (parseFloat(m.weightChi) || 0) > 0,
  );
  const materials = validMaterialRows.map((m) => ({
    materialId: m.materialId,
    weightChi: parseFloat(m.weightChi) || 0,
  }));

  // Gộp CẢ các dòng đá (nhiều nhóm đá chủ/đá tấm) vào 1 option duy nhất nên parentIndex phải tính theo
  // VỊ TRÍ thật trong mảng gửi đi (dòng đá trống đã bị loại), không theo vị trí trong máy tính.
  const validStoneRows = input.stoneMode === 'catalog' ? input.stoneRows.filter((r) => r.stoneId) : [];
  const stones = validStoneRows.map((r) => {
    const parentIdx = r.parentId ? validStoneRows.findIndex((other) => other.id === r.parentId) : -1;
    return {
      stoneId: r.stoneId,
      quantity: r.qty,
      ...(parentIdx >= 0 ? { parentIndex: parentIdx } : {}),
    };
  });
  const isManualStone = input.stoneMode === 'manual';

  return {
    optionName: input.optionName.trim() || 'Báo giá nhanh',
    materialName: validMaterialRows.map((m) => m.materialName).join(', ') || undefined,
    weightChi: validMaterialRows.length === 1 ? parseFloat(validMaterialRows[0].weightChi) || 0 : undefined,
    materials: materials.length > 0 ? materials : undefined,
    stones: stones.length > 0 ? stones : undefined,
    stoneDescription: isManualStone ? input.manualStoneName || undefined : undefined,
    stoneCost: isManualStone ? parseFloat(input.manualStonePrice) || 0 : undefined,
    quotedPrice: input.price,
    vat: input.vat,
    isSelected: true,
    groupId: input.groupId,
  };
}
