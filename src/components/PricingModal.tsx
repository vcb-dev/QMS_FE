import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuoteOption, QuoteRequest, Role } from '../types';
import {
  fetchMasterData,
  calculatePriceMultiApi,
  generatePricingOptionsApi,
  fetchStones,
  fetchSilverMultipliers,
} from '../services/api';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';
import type { StoneCatalogItem, StoneRow } from '../types';
import { useMaterialStoneRows } from '../hooks/useMaterialStoneRows';

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
  // VAT giờ lấy theo danh mục sản phẩm của yêu cầu đang báo giá (ProductCategory.vatRate),
  // không còn 1 giá trị mặc định global — fallback về PRICING_DEFAULTS nếu danh mục chưa cấu hình
  const defaultVatRate = selectedReq?.category?.vatRate ?? PRICING_DEFAULTS.VAT_PCT;

  // 1. Danh sách các phương án báo giá hiện tại
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 2. Khối máy tính để tạo phương án mới
  const [showCalculator, setShowCalculator] = useState(true);
  // State + CRUD của chất liệu/đá dùng chung với CalculatorPage qua hook này (xem
  // hooks/useMaterialStoneRows.ts) — alias lại tên cũ (calcMaterialRows/calcStoneRows...) để không
  // phải sửa lại toàn bộ chỗ dùng bên dưới.
  const {
    materialRows: calcMaterialRows,
    setMaterialRows: setCalcMaterialRows,
    addMaterialRow,
    updateMaterialRow,
    removeMaterialRow,
    stoneRows: calcStoneRows,
    setStoneRows: setCalcStoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    stonePricePerUnit,
    stoneName,
  } = useMaterialStoneRows(dbMaterials, stoneCatalog);
  const [calcLaborCost, setCalcLaborCost] = useState<string>(String(PRICING_DEFAULTS.LABOR_COST));
  const [calcVat, setCalcVat] = useState<string>(String(PRICING_DEFAULTS.VAT_PCT));
  const [calcIncludeVat, setCalcIncludeVat] = useState<boolean>(true);
  const [calcSilverMultiplier, setCalcSilverMultiplier] = useState<number>(3);

  // Đá đính
  const [calcStoneMode, setCalcStoneMode] = useState<'catalog' | 'manual'>('catalog');
  const [calcManualStoneName, setCalcManualStoneName] = useState('');
  const [calcManualStonePrice, setCalcManualStonePrice] = useState('');

  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Load lookup data once on mount
  useEffect(() => {
    Promise.allSettled([
      fetchMasterData(),
      fetchStones(),
      fetchSilverMultipliers(),
    ]).then(([mRes, sRes, silvRes]) => {
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
      // Phương án Sale THẬT SỰ chọn — ưu tiên CLOSED/SELECTED; nếu đơn cũ/dữ liệu thiếu cờ này
      // (không option nào SELECTED/CLOSED) thì fallback về option ĐẦU TIÊN thay vì khóa hết —
      // khóa hết sẽ khiến Order không còn cách nào chọn giá chính để báo giá cho đơn đó.
      const salePrimaryOption =
        realOptions.find((opt) => opt.selectionStatus === 'CLOSED') ||
        realOptions.find((opt) => opt.selectionStatus === 'SELECTED') ||
        realOptions[0];
      setOptions(
        realOptions.map((opt) => ({
          ...opt,
          // Option load từ DB (Sale tạo/đơn cũ) có quotedPrice là Decimal Prisma — qua JSON serialize
          // thành STRING, khác option Order vừa tự tính (số JS thật). hasValidPrice check
          // typeof === 'number' nên nếu không ép kiểu, chọn đúng option Sale sẽ bị coi là giá không
          // hợp lệ, nút "Xác Nhận & Gửi Báo Giá" bị khóa im lặng dù giá hiển thị vẫn đúng.
          quotedPrice: Number(opt.quotedPrice),
          isSelected: opt === salePrimaryOption,
          // Sale có thể gửi kèm nhiều phương án so sánh tuổi vàng (CalculatorPage tự sinh) — vẫn
          // hiện đủ để Order tham khảo, nhưng chỉ đúng 1 phương án Sale THẬT SỰ chọn mới được chọn
          // làm giá chính; các phương án còn lại là hàng đính kèm, khóa lựa chọn.
          locked: opt !== salePrimaryOption,
          // Cùng 1 cụm Sale gửi lên — để lồng các phương án đính kèm vào trong card của
          // salePrimaryOption khi hiển thị, thay vì hiện dạng list rời.
          groupId: 'sale',
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
    } else if (selectedReq.category?.vatRate != null) {
      setCalcVat(String(selectedReq.category.vatRate));
    }

    if (primaryOpt?.stones && primaryOpt.stones.length > 0) {
      setCalcStoneRows(
        primaryOpt.stones.map((s: any, idx: number) => ({
          id: `stone_${idx}_${Date.now()}`,
          stoneType: s.stone?.stoneType || '',
          stoneId: s.stoneId,
          qty: s.quantity || 1,
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

    setCalcError(null);
  }, [isOpen, selectedReq, dbMaterials, defaultVatRate, setCalcMaterialRows, setCalcStoneRows]);

  // Đổi chất liệu/khối lượng/đá hoặc tiền công/VAT sau khi đã bấm "Tính Giá Ngay" — chỉ xóa lỗi cũ.
  // Kết quả tính đã được thêm thẳng vào "Các Phương Án Báo Giá" ngay khi tính xong (xem
  // handleRunCalculate), không còn ở trạng thái xem trước nên không cần xóa gì thêm ở đây.
  useEffect(() => {
    setCalcError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMaterialRows, calcSilverMultiplier, calcStoneRows, calcStoneMode, calcManualStonePrice, calcManualStoneName, calcLaborCost, calcVat, calcIncludeVat]);

  if (!isOpen) return null;

  // Gộp thẳng phương án mới tính được vào "Các Phương Án Báo Giá" — không còn bước xem trước/bấm
  // "Thêm" thủ công nữa. Phương án trùng giá với phương án đã có bị bỏ qua (không có ý nghĩa so
  // sánh thêm). Nếu danh sách chưa có phương án nào được chọn, phương án ĐẦU TIÊN không bị khóa
  // (đúng chất liệu Sale yêu cầu) tự động được chọn làm giá chính; các phương án khác chất liệu
  // (locked=true) vẫn được thêm vào cùng danh sách để hiện dạng "OPTION ĐÍNH KÈM — CHỈ THAM KHẢO".
  const addOptionsToList = (newOpts: QuoteOption[]) => {
    setOptions((prev) => {
      const seenPrices = new Set(prev.map((o) => Number(o.quotedPrice)));
      const added: QuoteOption[] = [];
      newOpts.forEach((opt) => {
        if (opt.quotedPrice == null) return;
        const price = Number(opt.quotedPrice);
        if (seenPrices.has(price)) return;
        seenPrices.add(price);
        added.push(opt);
      });
      const hasSelected = prev.some((o) => o.isSelected);
      if (!hasSelected) {
        const firstSelectable = added.find((o) => !o.locked);
        if (firstSelectable) firstSelectable.isSelected = true;
      }
      return [...prev, ...added];
    });
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
        totalStoneCost = calcStoneRows.reduce((sum, r) => sum + r.qty * stonePricePerUnit(r.stoneId), 0);
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
            : calcStoneRows.map((r) => stoneName(r.stoneId)).join(', ');

        const fixedMaterialId = single.materialId || single.id;

        // BE sinh đủ tuổi vàng (10K/14K/18K/24K...) theo ĐÚNG tiền công/VAT vừa nhập, đánh dấu
        // isSelected=true cho ĐÚNG 1 phương án khớp chất liệu Sale yêu cầu — breakdown giá của
        // phương án khớp này giống hệt gọi /calculate riêng nên không cần gọi thêm API đó nữa.
        const generated = await generatePricingOptionsApi({
          requestedMatName: single.materialName,
          weightChi: w,
          laborCost: l,
          stoneCost: totalStoneCost,
          stoneDesc,
          vatRate: vatVal,
          includeVat: calcIncludeVat,
          categoryId: selectedReq?.category?.id || undefined,
          silverMultiplier: isSilver ? calcSilverMultiplier : undefined,
        });

        // groupId chung cho cả cụm (phương án khớp chất liệu Sale + các phương án tuổi vàng khác) —
        // để lồng các phương án khác chất liệu vào trong card của phương án khớp khi hiển thị.
        const groupId = `g_${Date.now()}`;
        // BE luôn đánh số "Phương án 1/2/3..." lại từ đầu mỗi lần gọi — Order bấm "Tính Giá Ngay"
        // nhiều lần (đổi công/VAT để so sánh) sẽ ra trùng tên "Phương án 1" giữa các cụm, lưu vào DB
        // vậy không phân biệt được. Đặt tên theo chất liệu + đúng mức công/VAT của cụm đó thay thế.
        const laborLabel = formatCurrency(l);
        const newOpts: QuoteOption[] = (Array.isArray(generated) ? generated : [])
          .filter((opt: any) => opt.quotedPrice != null)
          .map((opt: any) => {
            const optMaterial = dbMaterials.find((m) => m.name === opt.materialName);
            const materialId = optMaterial?.id || fixedMaterialId;
            return {
              optionName: `${opt.materialName} · Công ${laborLabel} · VAT ${vatVal}%`,
              materialName: opt.materialName,
              weightChi: opt.weightChi != null ? opt.weightChi : w,
              laborCost: opt.laborCost,
              stoneCost: opt.stoneCost,
              totalMetalCost: opt.totalMetalCost,
              metalRawCost: opt.metalRawCost,
              stonePrice: opt.stonePrice,
              vat: opt.vat,
              quotedPrice: opt.quotedPrice,
              isSelected: false,
              locked: !opt.isSelected,
              groupId,
              materials: materialId ? [{ materialId, weightChi: w }] : undefined,
              stones: stoneSelections,
              stoneDescription: stoneDesc,
              note: 'Tính từ máy tính giá',
            };
          });
        addOptionsToList(newOpts);
      } else {
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
        const matSummary = validRows.map((m) => `${m.materialName} (${m.weightChi} chỉ)`).join(' + ');

        addOptionsToList([
          {
            // Cùng lý do với nhánh 1 chất liệu — kèm công/VAT vào tên để bấm "Tính Giá Ngay" nhiều
            // lần không ra trùng tên "Phương án phối hợp" giữa các cụm khi lưu vào DB.
            optionName: `Phương án phối hợp (${matSummary}) · Công ${formatCurrency(l)} · VAT ${vatVal}%`,
            materialName: matSummary,
            weightChi: validRows.reduce((sum, m) => sum + (parseFloat(m.weightChi) || 0), 0),
            laborCost: res.laborCost,
            stoneCost: res.stoneCost,
            totalMetalCost: res.totalMetalCost,
            metalRawCost: res.metalRawCost,
            stonePrice: res.stonePrice || 0,
            vat: vatVal,
            quotedPrice: res.quotedPrice,
            isSelected: false,
            materials: payload.materials,
            stones: payload.stones,
            stoneDescription:
              calcStoneMode === 'manual'
                ? calcManualStoneName
                : calcStoneRows.map((r) => stoneName(r.stoneId)).join(', '),
            note: 'Tính từ máy tính giá',
          },
        ]);
      }
    } catch (err: any) {
      console.error('Lỗi tính giá:', err);
      setCalcError(err.message || 'Lỗi khi tính giá');
    } finally {
      setCalcLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    setOptions((prev) => {
      const chosen = prev[idx];
      if (chosen?.locked) return prev;
      // Order chọn 1 phương án Order TỰ TÍNH (không thuộc cụm 'sale') thay cho giá Sale đề xuất —
      // giá Sale coi như bị thay thế hẳn, bỏ luôn khỏi danh sách (không gửi kèm lên BE nữa) thay vì
      // giữ lại làm hàng đính kèm, tránh lưu dư 2 phương án cho cùng 1 yêu cầu khi Xác Nhận.
      const base = chosen && chosen.groupId !== 'sale'
        ? prev.filter((o) => o.groupId !== 'sale')
        : prev;
      return base.map((opt) => ({
        ...opt,
        isSelected: opt === chosen,
      }));
    });
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => {
      const removed = prev[idx];
      let next = prev.filter((_, i) => i !== idx);
      // Xóa phương án CHÍNH (không locked) thì xóa luôn cả cụm phương án đính kèm lồng trong card
      // của nó (cùng groupId) — các phương án đính kèm không có ý nghĩa gì khi đứng riêng.
      if (removed && !removed.locked && removed.groupId) {
        next = next.filter((o) => !(o.locked && o.groupId === removed.groupId));
      }
      // Phương án bị xóa từng là giá chính — chuyển giá chính sang phương án CHỌN ĐƯỢC đầu tiên
      // còn lại (bỏ qua option đính kèm/locked, vì đó không phải 1 lựa chọn hợp lệ).
      if (removed?.isSelected) {
        const fallback = next.find((o) => !o.locked);
        if (fallback) fallback.isSelected = true;
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

  // Phương án CHÍNH (không locked) hiện dạng card top-level; phương án đính kèm (locked) được
  // lồng vào bên trong card của phương án chính CÙNG groupId, thay vì hiện dạng list rời bên dưới.
  const primaryEntries = pricedOptions.filter(({ opt }) => !opt.locked);
  const lockedByGroup = new Map<string, typeof pricedOptions>();
  pricedOptions
    .filter(({ opt }) => opt.locked)
    .forEach((entry) => {
      const gid = entry.opt.groupId;
      const hasMatchingPrimary = !!gid && primaryEntries.some((p) => p.opt.groupId === gid);
      const key = hasMatchingPrimary ? (gid as string) : `_ungrouped_${entry.idx}`;
      if (!lockedByGroup.has(key)) lockedByGroup.set(key, []);
      lockedByGroup.get(key)!.push(entry);
    });

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
                  Các Phương Án Báo Giá ({primaryEntries.length})
                </h3>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                Chọn 1 phương án làm giá chính để chốt
              </span>
            </div>

            {primaryEntries.length === 0 ? (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Chưa có phương án nào. Hãy dùng bảng máy tính bên dưới và bấm <strong>"Tính Giá Ngay"</strong> — phương án sẽ tự hiện lên đây.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {primaryEntries.map(({ opt, idx }) => {
                  const children = opt.groupId ? lockedByGroup.get(opt.groupId) || [] : [];
                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: '10px',
                        background: opt.isSelected ? '#f0fdf4' : '#f8fafc',
                        border: opt.isSelected ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        onClick={() => handleSelectOption(idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 14px',
                          cursor: 'pointer',
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

                      {/* Phương án đính kèm (khác chất liệu Sale/tuổi vàng khác) — lồng trong card
                          của phương án chính cùng cụm, chỉ để tham khảo, không có radio chọn. */}
                      {children.length > 0 && (
                        <div style={{ padding: '0 14px 12px 40px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Phương án đính kèm — chỉ tham khảo
                          </span>
                          {children.map(({ opt: childOpt, idx: childIdx }) => (
                            <div
                              key={childIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '6px 10px',
                                background: '#ffffff',
                                border: '1px dashed #cbd5e1',
                                borderRadius: '8px',
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {childOpt.optionName || childOpt.materialName}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <strong style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatCurrency(childOpt.quotedPrice)}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(childIdx)}
                                  title="Xóa phương án đính kèm này"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                    {/* Order không được đổi chất liệu Sale đã yêu cầu — modal này luôn xử lý 1 đơn
                        có sẵn (selectedReq), nên khóa hẳn khả năng thêm dòng chất liệu mới. */}
                    {!selectedReq && (
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
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {calcMaterialRows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: calcMaterialRows.length > 1 && !selectedReq ? '1fr 140px 32px' : '1fr 140px',
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
                          disabled={!!selectedReq}
                          onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                          title={selectedReq ? 'Không thể đổi chất liệu Sale đã yêu cầu' : undefined}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 700,
                            background: selectedReq ? '#f1f5f9' : '#ffffff',
                            color: selectedReq ? '#64748b' : undefined,
                            cursor: selectedReq ? 'not-allowed' : 'pointer',
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

                        {calcMaterialRows.length > 1 && !selectedReq && (
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
                        maxLength={200}
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
                            value={sRow.stoneType}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneType: e.target.value as StoneRow['stoneType'], stoneId: '' })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                          >
                            <option value="">Loại đá</option>
                            <option value="MAIN">Đá chủ</option>
                            <option value="SIDE">Đá tấm</option>
                          </select>
                          <select
                            value={sRow.stoneId}
                            disabled={!sRow.stoneType}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneId: e.target.value })}
                            style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: sRow.stoneType ? '#ffffff' : '#f1f5f9' }}
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {stoneCatalog.filter((s) => s.stoneType === sRow.stoneType).map((s) => (
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
