import type { MaterialRow, QuoteOption, StoneRow } from '../types';

interface QuickOptionInput {
  optionName: string;
  price: number;
  vat: number;
  groupId: string;
  // Chất liệu/đá đang nằm trong máy tính của PricingModal (effect mở modal nạp từ yêu cầu của Sale).
  materialRows: MaterialRow[];
  // Các phương án đang có trên đơn — lấy chất liệu của các phương án NHÁP (chưa có giá) ghép thêm vào
  // phương án nhanh, vì máy tính chỉ giữ chất liệu đầu tiên (xem collectDraftMaterialRows).
  requestOptions?: QuoteOption[];
  stoneRows: StoneRow[];
  stoneMode: 'catalog' | 'manual';
  manualStoneName: string;
  manualStonePrice: string;
}

// Chất liệu Sale đã chọn lúc tạo đơn. BE tách mỗi chất liệu thành 1 phương án NHÁP (chưa có giá, đúng 1
// chất liệu) — modal báo giá chỉ nạp chất liệu ĐẦU TIÊN vào máy tính chính, các chất liệu còn lại nằm ở
// "phương án loại vàng khác" (compareRows) nên báo giá nhanh không thấy chúng. Gộp chất liệu của mọi
// phương án nháp, bỏ trùng theo materialId, khối lượng thiếu thì mặc định 1 chỉ như lúc modal nạp.
// Phương án đã có giá (Order/Sale đã báo) KHÔNG tính: chúng không phải chất liệu Sale yêu cầu.
export function collectDraftMaterialRows(options: QuoteOption[] | undefined): MaterialRow[] {
  const seen = new Set<string>();
  const rows: MaterialRow[] = [];
  (options ?? [])
    .filter((opt) => opt.quotedPrice == null)
    .forEach((opt) => {
      (opt.materials ?? []).forEach((m) => {
        const materialId = m.materialId || m.id || '';
        if (!materialId || seen.has(materialId)) return;
        seen.add(materialId);
        rows.push({
          id: `draft_${rows.length}`,
          materialId,
          materialName: m.materialName || m.material?.name || '',
          weightChi: m.weightChi != null ? String(m.weightChi) : '1.0',
        });
      });
    });
  return rows;
}

// Phương án "báo giá nhanh": Order gõ thẳng tổng tiền, không chạy công thức. Vẫn mang theo chất liệu/đá
// Sale đã yêu cầu — BE xóa hết & tạo lại options theo payload, nên option nhanh không kèm chúng thì đơn
// mất chất liệu (danh sách và trang chi tiết lấy chất liệu từ phương án đại diện).
export function buildQuickOption(input: QuickOptionInput): QuoteOption {
  // Dòng ở máy tính đứng trước (mang khối lượng Order đã sửa), rồi tới chất liệu Sale chọn chưa có mặt.
  const calcIds = new Set(input.materialRows.map((m) => m.materialId));
  const allMaterialRows = [
    ...input.materialRows,
    ...collectDraftMaterialRows(input.requestOptions).filter((m) => !calcIds.has(m.materialId)),
  ];
  const validMaterialRows = allMaterialRows.filter(
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
