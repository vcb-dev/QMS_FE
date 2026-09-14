import { useState } from 'react';
import type { MaterialRow, StoneRow, StoneCatalogItem } from '../types';
import { materialGroupKey } from '../utils/quoteOption';

const genRowId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

type StoneRowsMaterial = { id: string; name: string; baseMetalId?: string | null; baseMetal?: { id: string } | null };

// Gom state + CRUD cho 2 mảng "chất liệu" và "đá" dùng chung giữa CalculatorPage (Sale tự tính giá)
// và PricingModal (Order xử lý đơn).
export function useMaterialStoneRows(
  dbMaterials: StoneRowsMaterial[],
  stoneCatalog: StoneCatalogItem[],
  initialMaterialRows: MaterialRow[] = [],
) {
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>(initialMaterialRows);
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);

  // Từ 2 dòng chất liệu trở lên -> khoá chung 1 nhóm kim loại gốc (không trộn Vàng với Bạc/Bạch
  // kim...), lấy nhóm theo dòng ĐẦU TIÊN khớp được 1 chất liệu thật trong dbMaterials. Chỉ 1 dòng
  // thì chưa khoá gì — dòng đó tự do chọn, nhóm chỉ chốt khi thêm dòng thứ 2.
  const anchorMaterial =
    materialRows.length > 1
      ? materialRows
          .map((r) => dbMaterials.find((m) => m.id === r.materialId))
          .find((m): m is StoneRowsMaterial => !!m)
      : undefined;
  const lockedMaterialGroupKey = anchorMaterial ? materialGroupKey(anchorMaterial) : null;

  const addMaterialRow = () => {
    // Dòng mới phải cùng nhóm với các dòng đã có (nếu đang bị khoá) — không mặc định dbMaterials[0]
    // vô điều kiện như trước, tránh thêm ngay 1 dòng khác nhóm rồi phải sửa lại.
    const candidates = lockedMaterialGroupKey
      ? dbMaterials.filter((m) => materialGroupKey(m) === lockedMaterialGroupKey)
      : dbMaterials;
    const first = candidates[0] ?? dbMaterials[0];
    setMaterialRows((prev) => [
      ...prev,
      { id: genRowId(), materialId: first?.id || '', materialName: first?.name || '', weightChi: '1.0' },
    ]);
  };

  const updateMaterialRow = (id: string, patch: Partial<MaterialRow>) => {
    setMaterialRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.weightChi !== undefined) {
          const num = parseFloat(patch.weightChi);
          if (!isNaN(num) && num < 0) updated.weightChi = '0';
        }
        if (patch.materialId && dbMaterials.length > 0) {
          const found = dbMaterials.find((m) => m.id === patch.materialId);
          if (found) updated.materialName = found.name;
        }
        return updated;
      }),
    );
  };

  const removeMaterialRow = (id: string) => {
    setMaterialRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  };

  const addStoneRow = () => {
    setStoneRows((prev) => [...prev, { id: genRowId(), stoneType: '', stoneId: '', qty: 1 }]);
  };

  const updateStoneRow = (id: string, patch: Partial<StoneRow>) => {
    setStoneRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.qty !== undefined) updated.qty = Math.max(1, patch.qty);
        return updated;
      }),
    );
  };

  const removeStoneRow = (id: string) => {
    setStoneRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Tên đá tra theo catalog TẠI THỜI ĐIỂM ĐỌC (cho mô tả/nhãn). Đơn giá đá KHÔNG tính ở FE nữa —
  // BE nhận danh sách {stoneId, quantity} và tự cộng tổng tiền đá.
  const stoneName = (stoneId: string) => stoneCatalog.find((s) => s.id === stoneId)?.name || '';

  return {
    materialRows,
    setMaterialRows,
    addMaterialRow,
    updateMaterialRow,
    removeMaterialRow,
    lockedMaterialGroupKey,
    stoneRows,
    setStoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    stoneName,
  };
}
