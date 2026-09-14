import { useEffect, useState } from 'react';
import type { CompareRow } from '../types';

type CompareDbMaterial = { id: string; name: string; baseMetal?: { name: string } | null };

// Base metal của vàng lưu tên "Vàng 24K" trong DB (BaseMetal.name), không phải "Vàng" trơn — mọi
// chất liệu vàng (10K/14K/18K/24K...) đều trỏ chung 1 base metal này, chỉ khác priceRatioPct.
const isGoldBaseMetal = (name: string | undefined) => !!name && name.startsWith('Vàng');

// Đang chọn ĐÚNG 1 chất liệu và chất liệu đó gốc Vàng -> chế độ tự liệt kê hết loại vàng khác làm
// phương án so sánh (không cần bấm "+ Thêm phương án" từng cái). Thêm chất liệu thứ 2 (bất kể vì
// sao — request gốc có sẵn hay tự tay thêm), hoặc đổi sang chất liệu không phải Vàng, đều thoát
// chế độ này, quay lại thêm tay như cũ.
function isSingleGoldMaterialMode(
  materialRows: { materialId: string }[],
  dbMaterials: CompareDbMaterial[],
): boolean {
  if (materialRows.length !== 1) return false;
  const mat = dbMaterials.find((m) => m.id === materialRows[0].materialId);
  return isGoldBaseMetal(mat?.baseMetal?.name);
}

// State + CRUD cho danh sách "phương án loại vàng khác" (so sánh tham khảo) — dùng
// chung CalculatorPage + PricingModal. `materialRows` (mặc định []) chỉ cần khi muốn bật chế độ
// tự liệt kê vàng ở trên — hook vẫn dùng được như CRUD thuần nếu không truyền vào.
export function useCompareRows(
  dbMaterials: CompareDbMaterial[],
  materialRows: { materialId: string }[] = [],
) {
  const [compareRows, setCompareRows] = useState<CompareRow[]>([]);

  const autoGoldMode = isSingleGoldMaterialMode(materialRows, dbMaterials);
  const singleMaterialId = materialRows.length === 1 ? materialRows[0].materialId : null;

  // Tự động điền hết chất liệu Vàng khác (trừ chất liệu đang chọn), khối lượng mặc định rỗng —
  // dòng nào không nhập > 0 tự bị bỏ qua lúc tính/lưu (xem compareValid ở CalculatorPage/PricingModal).
  // Rời chế độ này thì dọn sạch, trả lại danh sách trống để thêm tay như hành vi cũ.
  useEffect(() => {
    if (!autoGoldMode) {
      setCompareRows([]);
      return;
    }
    const golds = dbMaterials.filter(
      (m) => isGoldBaseMetal(m.baseMetal?.name) && m.id !== singleMaterialId,
    );
    setCompareRows(
      golds.map((m) => ({
        id: `cmp_gold_${m.id}`,
        materialId: m.id,
        materialName: m.name,
        weightChi: '',
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGoldMode, singleMaterialId, dbMaterials]);

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

  return { compareRows, setCompareRows, addCompareRow, updateCompareRow, removeCompareRow, autoGoldMode };
}

