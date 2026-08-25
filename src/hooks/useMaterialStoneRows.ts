import { useState } from 'react';
import type { MaterialRow, StoneRow, StoneCatalogItem } from '../types';

const genRowId = () => `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

// Gom state + CRUD cho 2 mảng "chất liệu" và "đá" dùng chung giữa CalculatorPage (Sale tự tính giá)
// và PricingModal (Order xử lý đơn) — trước đây 2 file khai báo độc lập cùng 1 logic thêm/sửa/xóa
// dòng gần như y hệt nhau, sửa 1 bên dễ quên sửa bên kia (đúng nguyên nhân PricingModal phải sửa
// đi sửa lại nhiều lượt liên tiếp trong 1 buổi làm việc trước).
export function useMaterialStoneRows(
  dbMaterials: { id: string; name: string }[],
  stoneCatalog: StoneCatalogItem[],
  initialMaterialRows: MaterialRow[] = [],
) {
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>(initialMaterialRows);
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);

  const addMaterialRow = () => {
    const first = dbMaterials[0];
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

  // Đơn giá/tên đá luôn tra theo catalog TẠI THỜI ĐIỂM ĐỌC, không cache trên row — tránh giá cũ khi
  // catalog vừa đổi trong lúc modal đang mở lâu (PricingModal có thể mở lâu hơn CalculatorPage).
  const stonePricePerUnit = (stoneId: string) => stoneCatalog.find((s) => s.id === stoneId)?.price || 0;
  const stoneName = (stoneId: string) => stoneCatalog.find((s) => s.id === stoneId)?.name || '';

  return {
    materialRows,
    setMaterialRows,
    addMaterialRow,
    updateMaterialRow,
    removeMaterialRow,
    stoneRows,
    setStoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    stonePricePerUnit,
    stoneName,
  };
}
