import { useState } from 'react';
import type { CompareRow } from '../types';

// State + CRUD cho danh sách "phương án loại vàng khác" (so sánh tham khảo) — dùng
// chung CalculatorPage + PricingModal. Trước đây 2 file khai báo độc lập y hệt.
export function useCompareRows(dbMaterials: { id: string; name: string }[]) {
  const [compareRows, setCompareRows] = useState<CompareRow[]>([]);

  const addCompareRow = () =>
    setCompareRows((prev) => [
      ...prev,
      {
        id: `cmp_${Date.now()}_${prev.length}`,
        materialId: dbMaterials[0]?.id || '',
        materialName: dbMaterials[0]?.name || '',
        weightChi: '',
      },
    ]);

  const updateCompareRow = (
    id: string,
    patch: Partial<{ materialId: string; weightChi: string }>,
  ) =>
    setCompareRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
              ...(patch.materialId != null
                ? { materialName: dbMaterials.find((m) => m.id === patch.materialId)?.name || '' }
                : {}),
            }
          : row,
      ),
    );

  const removeCompareRow = (id: string) =>
    setCompareRows((prev) => prev.filter((row) => row.id !== id));

  return { compareRows, setCompareRows, addCompareRow, updateCompareRow, removeCompareRow };
}

