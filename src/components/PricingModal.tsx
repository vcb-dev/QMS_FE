import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuoteOption, QuoteRequest, Role } from '../types';
import {
  fetchMasterData,
  calculatePriceApi,
  calculatePriceMultiApi,
  generatePricingOptionsApi,
  fetchPricingConfig,
  fetchStones,
  fetchSilverMultipliers,
} from '../services/api';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';

type StoneCatalogItem = {
  id: string;
  stoneType: 'MAIN' | 'SIDE';
  name: string;
  cut?: string;
  size?: string;
  price: number;
};

type MaterialRow = {
  id: string;
  materialId: string;
  materialName: string;
  weightChi: string;
};

type StoneRow = {
  id: string;
  stoneKind: 'MAIN' | 'SIDE' | '';
  stoneId: string;
  type: string;
  qty: number;
  pricePerUnit: number;
};

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    price: number,
    vat: number,
    options?: QuoteOption[],
  ) => Promise<void>;
  onOpenCalculator?: () => void;
  selectedReq?: QuoteRequest | null;
  currentRole: Role;
  materials?: { id: string; name: string }[];
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenCalculator: _onOpenCalculator,
  selectedReq,
  currentRole: _currentRole,
  materials: initialMaterialsList = [],
}) => {
  // Master data
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string }[]>(initialMaterialsList);
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState<number>(PRICING_DEFAULTS.VAT_PCT);

  // 1. Danh sách các phương án báo giá hiện tại
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 2. Khối máy tính để tạo phương án mới
  const [showCalculator, setShowCalculator] = useState(true);
  const [calcMaterialRows, setCalcMaterialRows] = useState<MaterialRow[]>([]);
  const [calcLaborCost, setCalcLaborCost] = useState<string>(String(PRICING_DEFAULTS.LABOR_COST));
  const [calcVat, setCalcVat] = useState<string>(String(PRICING_DEFAULTS.VAT_PCT));
  const [calcIncludeVat, setCalcIncludeVat] = useState<boolean>(true);
  const [calcSilverMultiplier, setCalcSilverMultiplier] = useState<number>(3);

  // Đá đính
  const [calcStoneMode, setCalcStoneMode] = useState<'catalog' | 'manual'>('catalog');
  const [calcStoneRows, setCalcStoneRows] = useState<StoneRow[]>([]);
  const [calcManualStoneName, setCalcManualStoneName] = useState('');
  const [calcManualStonePrice, setCalcManualStonePrice] = useState('');

  // Tên phương án mới & Kết quả tính thử
  const [calcOptionName, setCalcOptionName] = useState('');
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  // Bảng phương án gợi ý tự sinh (VD: đủ giá 10K/14K/18K/24K khi chọn vàng) — giống CalculatorPage,
  // chỉ tính khi luồng 1 chất liệu. Mỗi gợi ý có thể bấm "+ Thêm" để đưa thẳng vào danh sách báo giá.
  const [generatedOptions, setGeneratedOptions] = useState<any[]>([]);

  // Load lookup data once on mount
  useEffect(() => {
    Promise.allSettled([
      fetchMasterData(),
      fetchStones(),
      fetchSilverMultipliers(),
      fetchPricingConfig(),
    ]).then(([mRes, sRes, silvRes, cfgRes]) => {
      if (mRes.status === 'fulfilled' && mRes.value?.materials) {
        setDbMaterials(mRes.value.materials);
      }
      if (sRes.status === 'fulfilled' && Array.isArray(sRes.value)) {
        setStoneCatalog(sRes.value);
      }
      if (silvRes.status === 'fulfilled' && Array.isArray(silvRes.value)) {
        setSilverMultipliers(silvRes.value);
        if (silvRes.value.length > 0) setCalcSilverMultiplier(silvRes.value[0]);
      }
      if (cfgRes.status === 'fulfilled' && typeof cfgRes.value?.defaultVatRate === 'number') {
        setDefaultVatRate(cfgRes.value.defaultVatRate);
        setCalcVat(String(cfgRes.value.defaultVatRate));
      }
    });
  }, []);

  // Khi modal mở, nạp danh sách options hiện có và chuẩn bị form máy tính
  useEffect(() => {
    if (!isOpen || !selectedReq) return;

    // Bản nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu) không phải 1 phương
    // án báo giá thật — không đưa vào state options, nếu không sẽ lệch số thứ tự "Phương án N" và
    // bị gửi kèm lên BE lúc Xác Nhận, tạo dư 1 row quote_options + quote_option_materials rỗng.
    const realOptions = (selectedReq.options || []).filter((opt) => opt.quotedPrice != null);
    if (realOptions.length > 0) {
      setOptions(
        realOptions.map((opt) => ({
          ...opt,
          isSelected: opt.selectionStatus === 'SELECTED' || opt.selectionStatus === 'CLOSED' || !!opt.isSelected,
        })),
      );
    } else if (selectedReq.quotedPrice) {
      setOptions([
        {
          optionName: 'Phương án ban đầu',
          materialName: selectedReq.materials?.map((m) => m.name).join(', ') || 'Chất liệu chuẩn',
          quotedPrice: selectedReq.quotedPrice,
          vat: defaultVatRate,
          isSelected: true,
        },
      ]);
    } else {
      setOptions([]);
    }

    const reqMaterials = selectedReq.materials || [];
    const primaryOpt =
      selectedReq.options?.find((o) => o.selectionStatus === 'CLOSED') ||
      selectedReq.options?.find((o) => o.selectionStatus === 'SELECTED') ||
      selectedReq.options?.[0];

    if (primaryOpt?.materials && primaryOpt.materials.length > 0) {
      setCalcMaterialRows(
        primaryOpt.materials.map((m: any, idx: number) => ({
          id: `m_${idx}_${Date.now()}`,
          materialId: m.materialId || m.id,
          materialName: m.materialName || m.material?.name || '',
          weightChi: m.weightChi != null ? String(m.weightChi) : '1.0',
        })),
      );
    } else if (reqMaterials.length > 0) {
      setCalcMaterialRows(
        reqMaterials.map((m, idx) => ({
          id: `m_${idx}_${Date.now()}`,
          materialId: m.id,
          materialName: m.name,
          weightChi: '1.0',
        })),
      );
    } else if (dbMaterials.length > 0) {
      setCalcMaterialRows([
        {
          id: `m_0_${Date.now()}`,
          materialId: dbMaterials[0].id,
          materialName: dbMaterials[0].name,
          weightChi: '1.0',
        },
      ]);
    }

    if (primaryOpt?.laborCost != null) {
      setCalcLaborCost(String(primaryOpt.laborCost));
    } else if (selectedReq.category?.laborCost != null) {
      setCalcLaborCost(String(selectedReq.category.laborCost));
    }

    if (primaryOpt?.vat != null) {
      setCalcVat(String(primaryOpt.vat));
      setCalcIncludeVat(Number(primaryOpt.vat) > 0);
    }

    if (primaryOpt?.stones && primaryOpt.stones.length > 0) {
      setCalcStoneRows(
        primaryOpt.stones.map((s: any, idx: number) => ({
          id: `stone_${idx}_${Date.now()}`,
          stoneKind: s.stone?.stoneType || '',
          stoneId: s.stoneId,
          type: s.stoneName || s.stone?.name || '',
          qty: s.quantity || 1,
          pricePerUnit: s.price || s.stone?.price || 0,
        })),
      );
      setCalcStoneMode('catalog');
    } else if (primaryOpt?.stoneCost != null && Number(primaryOpt.stoneCost) > 0) {
      setCalcManualStonePrice(String(primaryOpt.stoneCost));
      setCalcManualStoneName(primaryOpt.stoneDescription || 'Đá tổng');
      setCalcStoneMode('manual');
    } else {
      setCalcStoneRows([]);
      setCalcManualStonePrice('');
      setCalcManualStoneName('');
    }

    setCalcResult(null);
    setCalcError(null);
    setCalcOptionName('');
    setGeneratedOptions([]);
  }, [isOpen, selectedReq, dbMaterials, defaultVatRate]);

  // Đổi chất liệu/khối lượng/tiền công/VAT/đá sau khi đã bấm "Tính Giá Ngay" — xóa kết quả cũ ngay,
  // tránh hiển thị nhầm giá của chất liệu/thông số trước đó (VD: đổi sang Bạc nhưng vẫn thấy giá Vàng cũ).
  useEffect(() => {
    setCalcResult(null);
    setCalcError(null);
    setGeneratedOptions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMaterialRows, calcLaborCost, calcVat, calcIncludeVat, calcSilverMultiplier, calcStoneRows, calcStoneMode, calcManualStonePrice, calcManualStoneName]);

  if (!isOpen) return null;

  const addMaterialRow = () => {
    const first = dbMaterials[0];
    setCalcMaterialRows((prev) => [
      ...prev,
      {
        id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        materialId: first?.id || '',
        materialName: first?.name || '',
        weightChi: '1.0',
      },
    ]);
  };

  const updateMaterialRow = (id: string, patch: Partial<MaterialRow>) => {
    setCalcMaterialRows((prev) =>
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
    if (calcMaterialRows.length <= 1) return;
    setCalcMaterialRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addStoneRow = () => {
    setCalcStoneRows((prev) => [
      ...prev,
      { id: `s_${Date.now()}`, stoneKind: '', stoneId: '', type: '', qty: 1, pricePerUnit: 0 },
    ]);
  };

  const updateStoneRow = (id: string, patch: Partial<StoneRow>) => {
    setCalcStoneRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        if (patch.qty !== undefined) {
          updated.qty = Math.max(1, patch.qty);
        }
        if (patch.stoneId && stoneCatalog.length > 0) {
          const found = stoneCatalog.find((s) => s.id === patch.stoneId);
          if (found) {
            updated.type = found.name;
            updated.pricePerUnit = found.price;
          }
        }
        return updated;
      }),
    );
  };

  const removeStoneRow = (id: string) => {
    setCalcStoneRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRunCalculate = async () => {
    const validRows = calcMaterialRows.filter(
      (m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0,
    );
    if (validRows.length === 0) {
      setCalcError('Vui lòng chọn ít nhất 1 chất liệu và nhập trọng lượng hợp lệ');
      return;
    }

    setCalcLoading(true);
    setCalcError(null);
    try {
      const l = parseFloat(calcLaborCost) || 0;
      const vatVal = calcIncludeVat ? (parseFloat(calcVat) || 10) : 0;

      let totalStoneCost = 0;
      if (calcStoneMode === 'manual') {
        totalStoneCost = parseFloat(calcManualStonePrice) || 0;
      } else {
        totalStoneCost = calcStoneRows.reduce((sum, r) => sum + r.qty * r.pricePerUnit, 0);
      }

      if (validRows.length === 1) {
        const single = validRows[0];
        const w = parseFloat(single.weightChi) || 0;
        const isSilver =
          /BẠC|SILVER|925/i.test(single.materialName) && !/BẠCH/i.test(single.materialName);

        const stoneSelections =
          calcStoneMode === 'catalog' && calcStoneRows.length > 0
            ? calcStoneRows.filter((r) => r.stoneId).map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
            : undefined;
        const stoneDesc =
          calcStoneMode === 'manual'
            ? calcManualStoneName
            : calcStoneRows.map((r) => r.type).join(', ');

        const [res, generated] = await Promise.all([
          calculatePriceApi({
            materialNameOrKey: single.materialName,
            weightChi: w,
            laborCost: l,
            stoneCost: totalStoneCost,
            vatRate: vatVal,
            includeVat: calcIncludeVat,
            categoryId: selectedReq?.category?.id || undefined,
            silverMultiplier: isSilver ? calcSilverMultiplier : undefined,
          }),
          generatePricingOptionsApi({
            requestedMatName: single.materialName,
            weightChi: w,
            laborCost: l,
            stoneCost: totalStoneCost,
            stoneDesc,
            vatRate: vatVal,
            includeVat: calcIncludeVat,
            categoryId: selectedReq?.category?.id || undefined,
            silverMultiplier: isSilver ? calcSilverMultiplier : undefined,
          }).catch(() => []),
        ]);

        setCalcResult({
          ...res,
          weightChi: w,
          materials: [
            {
              materialId: single.materialId || single.id,
              materialName: single.materialName,
              weightChi: w,
            },
          ],
          stones: stoneSelections,
          stoneDescription: stoneDesc,
        });

        // Ép về đúng chất liệu/đá đang nhập trong máy tính — API generate-options chỉ tính giá theo
        // tuổi vàng, không biết materialId/stones cụ thể (giống cách CalculatorPage xử lý).
        setGeneratedOptions(
          (Array.isArray(generated) ? generated : []).map((opt: any) => ({
            ...opt,
            weightChi: opt.weightChi != null ? opt.weightChi : w,
            materials: single.materialId
              ? [{ materialId: single.materialId, weightChi: w }]
              : undefined,
            stones: stoneSelections,
          })),
        );
      } else {
        setGeneratedOptions([]);
        const payload = {
          materials: validRows.map((m) => ({
            materialId: m.materialId || m.id,
            materialName: m.materialName,
            weightChi: parseFloat(m.weightChi) || 0,
          })),
          categoryId: selectedReq?.category?.id || undefined,
          laborCost: l,
          vatRate: vatVal,
          includeVat: calcIncludeVat,
          stones:
            calcStoneMode === 'catalog' && calcStoneRows.length > 0
              ? calcStoneRows
                  .filter((r) => r.stoneId)
                  .map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
              : undefined,
          manualStoneName:
            calcStoneMode === 'manual' && calcManualStoneName.trim()
              ? calcManualStoneName.trim()
              : undefined,
          manualStonePrice: calcStoneMode === 'manual' && totalStoneCost > 0 ? totalStoneCost : undefined,
        };

        const res = await calculatePriceMultiApi(payload);

        setCalcResult({
          totalMetalCost: res.totalMetalCost,
          metalRawCost: res.metalRawCost,
          laborCost: res.laborCost,
          stoneCost: res.stoneCost,
          stonePrice: res.stonePrice || 0,
          vatRate: vatVal,
          vatAmount: res.vatAmount,
          quotedPrice: res.quotedPrice,
          breakdown: res.breakdown,
          weightChi: validRows.reduce((sum, m) => sum + (parseFloat(m.weightChi) || 0), 0),
          materials: payload.materials,
          stones: payload.stones,
          stoneDescription:
            calcStoneMode === 'manual'
              ? calcManualStoneName
              : calcStoneRows.map((r) => r.type).join(', '),
        });
      }
    } catch (err: any) {
      console.error('Lỗi tính giá:', err);
      setCalcError(err.message || 'Lỗi khi tính giá');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleAddCalculatedOption = () => {
    if (!calcResult || !calcResult.quotedPrice) return;

    const validRows = calcMaterialRows.filter(
      (m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0,
    );
    const matSummary = validRows.map((m) => `${m.materialName} (${m.weightChi} chỉ)`).join(' + ');
    const defaultName = `Phương án ${options.length + 1} (${matSummary})`;
    const finalName = calcOptionName.trim() || defaultName;

    const newOption: QuoteOption = {
      optionName: finalName,
      materialName: matSummary,
      weightChi: calcResult.weightChi,
      laborCost: calcResult.laborCost,
      stoneCost: calcResult.stoneCost,
      totalMetalCost: calcResult.totalMetalCost,
      metalRawCost: calcResult.metalRawCost,
      stonePrice: calcResult.stonePrice,
      vat: calcIncludeVat ? (parseFloat(calcVat) || 10) : 0,
      quotedPrice: calcResult.quotedPrice,
      isSelected: options.length === 0,
      materials: calcResult.materials,
      stones: calcResult.stones,
      stoneDescription: calcResult.stoneDescription,
      note: 'Tính từ máy tính giá',
    };

    setOptions((prev) => [...prev, newOption]);
    setCalcResult(null);
    setCalcOptionName('');
  };

  // Build 1 QuoteOption từ 1 phần tử trong bảng gợi ý tự sinh — dùng chung cho thêm-từng-cái và
  // thêm-hết. baseCount = số phương án đã có TRƯỚC khi thêm (đánh số "Phương án N" cho đúng).
  const buildOptionFromGenerated = (opt: any, baseCount: number): QuoteOption | null => {
    if (opt.quotedPrice == null) return null;
    return {
      optionName: opt.optionName || opt.materialName || `Phương án ${baseCount + 1}`,
      materialName: opt.materialName,
      weightChi: opt.weightChi,
      laborCost: opt.laborCost,
      stoneCost: opt.stoneCost,
      totalMetalCost: opt.totalMetalCost,
      metalRawCost: opt.metalRawCost,
      stonePrice: opt.stonePrice,
      vat: opt.vat,
      quotedPrice: opt.quotedPrice,
      isSelected: baseCount === 0,
      materials: opt.materials,
      stones: opt.stones,
      stoneDescription: opt.stoneDescription,
      note: 'Tính từ bảng gợi ý',
    };
  };

  // Thêm 1 phương án từ bảng gợi ý tự sinh (VD: "Vàng 14K") thẳng vào danh sách báo giá —
  // không cần bấm "Tính Giá Ngay" riêng cho từng tuổi vàng.
  const handleAddGeneratedOption = (opt: any) => {
    const newOption = buildOptionFromGenerated(opt, options.length);
    if (!newOption) return;
    setOptions((prev) => [...prev, newOption]);
  };

  // Thêm hết toàn bộ bảng gợi ý vào danh sách báo giá cùng lúc.
  const handleAddAllGeneratedOptions = () => {
    setOptions((prev) => {
      const added = generatedOptions
        .map((opt, i) => buildOptionFromGenerated(opt, prev.length + i))
        .filter((o): o is QuoteOption => o !== null);
      return [...prev, ...added];
    });
  };

  const handleSelectOption = (idx: number) => {
    setOptions((prev) =>
      prev.map((opt, i) => ({
        ...opt,
        isSelected: i === idx,
      })),
    );
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (prev[idx]?.isSelected && next.length > 0) {
        next[0].isSelected = true;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOpt = options.find((o) => o.isSelected) || options[0];
    const hasValidPrice =
      options.length > 0 &&
      selectedOpt != null &&
      typeof selectedOpt.quotedPrice === 'number' &&
      Number(selectedOpt.quotedPrice) > 0;

    if (!hasValidPrice || !selectedOpt) {
      alert('Vui lòng tính và thêm ít nhất 1 phương án báo giá hợp lệ trước khi lưu!');
      return;
    }

    const primaryPrice = selectedOpt.quotedPrice;
    const primaryVat = selectedOpt.vat != null ? Number(selectedOpt.vat) : defaultVatRate;

    setSubmitting(true);
    try {
      await onSubmit(primaryPrice, primaryVat, options);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu báo giá');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOpt = options.find((o) => o.isSelected) || options[0];
  const hasValidPrice =
    options.length > 0 &&
    selectedOpt != null &&
    typeof selectedOpt.quotedPrice === 'number' &&
    Number(selectedOpt.quotedPrice) > 0;

  const isSilverPresent = calcMaterialRows.some(
    (m) => /BẠC|SILVER|925/i.test(m.materialName) && !/BẠCH/i.test(m.materialName),
  );

  // Ẩn option nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu, quotedPrice null)
  // khỏi danh sách hiển thị/đếm số — chỉ phương án đã tính giá thật mới coi là 1 phương án báo giá.
  // Giữ nguyên idx gốc trong mảng options để các handler chọn/xóa vẫn hoạt động đúng.
  const pricedOptions = options
    .map((opt, idx) => ({ opt, idx }))
    .filter(({ opt }) => opt.quotedPrice != null);

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '860px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ background: '#0f172a', padding: '16px 20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
              Báo Giá Yêu Cầu {selectedReq?.code || ''}
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Khách: <strong>{selectedReq?.customer?.name || 'Khách vãng lai'}</strong> — Danh mục: <strong>{selectedReq?.category?.name || '---'}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#d97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Các Phương Án Báo Giá ({pricedOptions.length})
                </h3>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                Chọn 1 phương án làm giá chính để chốt
              </span>
            </div>

            {pricedOptions.length === 0 ? (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Chưa có phương án nào. Hãy dùng bảng máy tính bên dưới để tính và bấm <strong>"+ Thêm vào danh sách"</strong>.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pricedOptions.map(({ opt, idx }) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      background: opt.isSelected ? '#f0fdf4' : '#f8fafc',
                      border: opt.isSelected ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <input
                        type="radio"
                        name="selectedOptionRadio"
                        checked={!!opt.isSelected}
                        onChange={() => handleSelectOption(idx)}
                        style={{ width: '16px', height: '16px', accentColor: '#16a34a', cursor: 'pointer' }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                          {opt.optionName || `Phương án ${idx + 1}`}
                          {opt.isSelected && (
                            <span style={{ marginLeft: '8px', background: '#16a34a', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>
                              ĐÃ CHỌN LÀM GIÁ CHÍNH
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {opt.materialName ? `Chất liệu: ${opt.materialName}` : ''}
                          {opt.weightChi ? ` · ${opt.weightChi} chỉ` : ''}
                          {opt.vat != null ? ` · VAT ${opt.vat}%` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <strong style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(opt.quotedPrice)}
                      </strong>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOption(idx);
                        }}
                        title="Xóa phương án này"
                        style={{
                          background: '#fee2e2',
                          border: 'none',
                          color: '#dc2626',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KHỐI 2: MÁY TÍNH BÁO GIÁ / TẠO PHƯƠNG ÁN MỚI (DẠNG NHƯ BÊN CALCULATOR) */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: showCalculator ? '14px' : 0,
              }}
              onClick={() => setShowCalculator((prev) => !prev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={18} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Máy Tính Báo Giá / Tạo Phương Án Mới
                </h3>
              </div>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                {showCalculator ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {showCalculator && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Chất liệu & Khối lượng */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Chất Liệu Chế Tác & Khối Lượng (Chỉ)
                    </label>
                    <button
                      type="button"
                      onClick={addMaterialRow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} /> Thêm chất liệu
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {calcMaterialRows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: calcMaterialRows.length > 1 ? '1fr 140px 32px' : '1fr 140px',
                          gap: '10px',
                          alignItems: 'center',
                        }}
                      >
                        <select
                          // Ép remount khi dbMaterials load xong (từ [] sang có data) — nếu không, React
                          // không tự sync lại DOM <select> vì chuỗi value không đổi giữa 2 lần render,
                          // dù <option> khớp giờ đã tồn tại (dropdown hiện trống dù value đúng).
                          key={dbMaterials.length}
                          value={row.materialId}
                          onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: '#ffffff',
                          }}
                        >
                          {dbMaterials.map((mat) => (
                            <option key={mat.id} value={mat.id}>
                              {mat.name}
                            </option>
                          ))}
                        </select>

                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.weightChi}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v !== '' && parseFloat(v) < 0) return;
                              updateMaterialRow(row.id, { weightChi: v });
                            }}
                            placeholder="Số chỉ"
                            style={{
                              width: '100%',
                              padding: '8px 38px 8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              fontWeight: 700,
                              background: '#ffffff',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                            chỉ
                          </span>
                        </div>

                        {calcMaterialRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(row.id)}
                            style={{
                              height: '32px',
                              width: '32px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Tiền công & VAT */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Tiền Công Chế Tác (₫)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberVN(calcLaborCost)}
                      onChange={(e) => setCalcLaborCost(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#ffffff' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Thuế VAT (%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={calcVat}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v !== '' && parseFloat(v) < 0) return;
                          setCalcVat(v);
                        }}
                        style={{ width: '65px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, background: '#ffffff' }}
                      />
                      <label style={{ fontSize: '12px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={calcIncludeVat}
                          onChange={(e) => setCalcIncludeVat(e.target.checked)}
                          style={{ width: '15px', height: '15px', accentColor: '#2563eb' }}
                        />
                        Cộng
                      </label>
                    </div>
                  </div>
                </div>

                {/* Hệ số nhân Bạc (nếu có Bạc) */}
                {isSilverPresent && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Hệ số nhân Bạc:</label>
                    <select
                      value={calcSilverMultiplier}
                      onChange={(e) => setCalcSilverMultiplier(parseFloat(e.target.value) || 3)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700 }}
                    >
                      {silverMultipliers.map((m) => (
                        <option key={m} value={m}>× {m}</option>
                      ))}
                      {silverMultipliers.length === 0 && <option value={3}>× 3</option>}
                    </select>
                  </div>
                )}

                {/* 3. Đá quý */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                      Thông Số Đá Quý
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setCalcStoneMode('catalog')}
                        style={{
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          border: calcStoneMode === 'catalog' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: calcStoneMode === 'catalog' ? '#0f172a' : '#ffffff',
                          color: calcStoneMode === 'catalog' ? '#ffffff' : '#334155',
                        }}
                      >
                        Bảng đá
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcStoneMode('manual')}
                        style={{
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                          border: calcStoneMode === 'manual' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          background: calcStoneMode === 'manual' ? '#0f172a' : '#ffffff',
                          color: calcStoneMode === 'manual' ? '#ffffff' : '#334155',
                        }}
                      >
                        Nhập tiền đá
                      </button>
                    </div>
                  </div>

                  {calcStoneMode === 'manual' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                      <input
                        type="text"
                        value={calcManualStoneName}
                        onChange={(e) => setCalcManualStoneName(e.target.value)}
                        placeholder="Mô tả đá (VD: Kim cương 4.5 ly)"
                        style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberVN(calcManualStonePrice)}
                        onChange={(e) => setCalcManualStonePrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="Giá đá (₫)"
                        style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700 }}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {calcStoneRows.map((sRow) => (
                        <div key={sRow.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 70px 28px', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={sRow.stoneKind}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneKind: e.target.value as StoneRow['stoneKind'], stoneId: '', type: '', pricePerUnit: 0 })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                          >
                            <option value="">Loại đá</option>
                            <option value="MAIN">Đá chủ</option>
                            <option value="SIDE">Đá tấm</option>
                          </select>
                          <select
                            value={sRow.stoneId}
                            disabled={!sRow.stoneKind}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneId: e.target.value })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: sRow.stoneKind ? '#ffffff' : '#f1f5f9' }}
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {stoneCatalog.filter((s) => s.stoneType === sRow.stoneKind).map((s) => (
                              <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price)})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            value={sRow.qty}
                            onChange={(e) => updateStoneRow(sRow.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            placeholder="SL"
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', textAlign: 'right', fontWeight: 700 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeStoneRow(sRow.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addStoneRow}
                        style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11.5px', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }}
                      >
                        + Thêm loại đá
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Nút Tính Giá */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {calcError ? (
                    <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 700 }}>{calcError}</span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={handleRunCalculate}
                    disabled={calcLoading}
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#78350f',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
                      opacity: calcLoading ? 0.7 : 1,
                    }}
                  >
                    {calcLoading ? 'Đang tính...' : 'Tính Giá Ngay'}
                  </button>
                </div>

                {/* 5. Kết quả tính thử & Nút Thêm vào danh sách */}
                {calcResult && (
                  <div style={{ background: '#ffffff', border: '1.5px solid #22c55e', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>Kết quả tính thử:</span>
                      <strong style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(calcResult.quotedPrice)}
                      </strong>
                    </div>

                    {/* Breakdown */}
                    <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px' }}>
                      {calcResult.breakdown && calcResult.breakdown.length > 1 ? (
                        calcResult.breakdown.map((b: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {b.materialName} ({b.weightChi} chỉ):</span>
                            <strong>{formatCurrency(b.cost)}</strong>
                          </div>
                        ))
                      ) : null}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Giá kim loại:</span>
                        <strong>{formatCurrency(calcResult.totalMetalCost)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Công chế tác:</span>
                        <strong>{formatCurrency(calcResult.laborCost)}</strong>
                      </div>
                      {calcResult.stoneCost > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Giá đá (gồm lãi):</span>
                          <strong>{formatCurrency(calcResult.stonePrice || calcResult.stoneCost)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>VAT ({calcResult.vatRate || 10}%):</span>
                        <strong>{formatCurrency(calcResult.vatAmount)}</strong>
                      </div>
                    </div>

                    {/* Tên & Nút Thêm */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={calcOptionName}
                        onChange={(e) => setCalcOptionName(e.target.value)}
                        placeholder="Tên phương án (VD: Phương án phối 2 màu, Vàng 18K...)"
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 600 }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCalculatedOption}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={15} /> Thêm Vào Danh Sách Báo Giá
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Bảng phương án gợi ý tự sinh (VD: đủ giá 10K/14K/18K/24K khi chọn vàng) —
                    bấm "+ Thêm" ở phương án nào là đưa thẳng vào danh sách báo giá, khỏi phải sửa
                    chất liệu rồi tính lại từng cái. */}
                {generatedOptions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        Phương án gợi ý
                      </span>
                      <button
                        type="button"
                        onClick={handleAddAllGeneratedOptions}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: '#dcfce7', border: '1px solid #16a34a', borderRadius: '7px',
                          padding: '5px 10px', fontSize: '11.5px', fontWeight: 800, color: '#16a34a',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={13} /> Thêm hết
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {generatedOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: opt.isSelected ? '#fffbeb' : '#f8fafc',
                            border: opt.isSelected ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(opt.materialName || opt.optionName || '').replace(/\s*\(Áp dụng[^)]*\)/i, '').trim()}
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(opt.quotedPrice)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddGeneratedOption(opt)}
                            title="Thêm phương án này vào danh sách báo giá"
                            style={{
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              border: '1px solid #16a34a',
                              background: '#dcfce7',
                              color: '#16a34a',
                              cursor: 'pointer',
                            }}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting || !hasValidPrice}
              title={
                !hasValidPrice
                  ? 'Cần có ít nhất 1 phương án báo giá hợp lệ (> 0đ) để gửi báo giá'
                  : 'Xác nhận và gửi báo giá này'
              }
              style={{
                background: !hasValidPrice ? '#94a3b8' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: !hasValidPrice ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: !hasValidPrice ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              {submitting ? 'Đang lưu...' : 'Xác Nhận & Gửi Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
