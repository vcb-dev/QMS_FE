import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Trash2, Layers, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { QuoteOption, QuoteOptionMaterial, QuoteOptionStone, QuoteRequest, Role, StoneRow } from '../types';
import { formatStoneDisplay } from '../utils/stoneFormatter';
import {
  fetchMasterData,
  calculatePriceBatchApi,
  fetchStones,
  fetchSilverMultipliers,
} from '../services/api';
import type { CalculateBatchResultItem } from '../services/api';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';
import { getPriceBreakdown, renderPriceBreakdownLines, getCostBreakdown, renderCostBreakdownLines } from '../utils/priceBreakdown';
import { getPrimaryOption, batchResultToOption, materialGroupKey } from '../utils/quoteOption';
import type { StoneCatalogItem } from '../types';
import { useMaterialStoneRows } from '../hooks/useMaterialStoneRows';
import { useCompareRows } from '../hooks/useCompareRows';
import { clsx } from 'clsx';
import { modalCloseIconBtnCls, modalBackdropCls, modalCardCls, modalHeaderCls, labelUppercaseCls } from '../styles/classNames';
import { useModalA11y } from '../hooks/useModalA11y';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    price: number,
    vat: number,
    options?: QuoteOption[],
    extras?: { inspectionFee?: number },
  ) => Promise<void>;
  onOpenCalculator?: () => void;
  selectedReq?: QuoteRequest | null;
  currentRole: Role;
  materials?: { id: string; name: string; baseMetalId?: string | null; baseMetal?: { id: string; name: string } | null }[];
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
  const dialogRef = useModalA11y(onClose, isOpen);

  // Master data
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string; baseMetalId?: string | null; baseMetal?: { id: string; name: string } | null }[]>(initialMaterialsList);
  
  const isSilverMaterialId = (materialId?: string) =>
    !!materialId && dbMaterials.find((m) => m.id === materialId)?.baseMetal?.name === 'Bạc';
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  // VAT lấy theo danh mục sản phẩm của yêu cầu đang báo giá (ProductCategory.vatRate),
  // fallback về PRICING_DEFAULTS nếu danh mục chưa cấu hình
  const defaultVatRate = selectedReq?.category?.vatRate ?? PRICING_DEFAULTS.VAT_PCT;
  // Đơn ĐÃ có giá (QUOTED/CLOSED) mở lại modal này là để SỬA giá, không phải báo giá lần đầu —
  // chỉ đổi label nút, luồng gửi thật đã tự rẽ nhánh ở handlePricingSubmit (useQuoteRequests.ts).
  const isEditMode = selectedReq?.status === 'QUOTED' || selectedReq?.status === 'CLOSED';

  // 1. Danh sách các phương án báo giá hiện tại
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 2. Khối máy tính để tạo phương án mới
  const [showCalculator, setShowCalculator] = useState(true);
  // State + CRUD của chất liệu/đá dùng chung với CalculatorPage qua hook này (xem
  // hooks/useMaterialStoneRows.ts) — alias tên nội bộ thành calcMaterialRows/calcStoneRows...
  const {
    materialRows: calcMaterialRows,
    setMaterialRows: setCalcMaterialRows,
    addMaterialRow,
    updateMaterialRow,
    removeMaterialRow,
    lockedMaterialGroupKey,
    stoneRows: calcStoneRows,
    setStoneRows: setCalcStoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    stoneName,
  } = useMaterialStoneRows(dbMaterials, stoneCatalog);
  // Báo giá nhanh — Order gõ thẳng tổng tiền cho yêu cầu, không qua máy tính/công thức nào (VD:
  // "vàng 10k, báo X đồng"). Tạo 1 QuoteOption chỉ có optionName + quotedPrice + vat, không kèm
  // chất liệu/đá — BE (buildOptionCreateInput) đã hỗ trợ sẵn option rỗng materials/stones.
  const [pricingMode, setPricingMode] = useState<'calculator' | 'quick'>('calculator');
  const [quickOptionName, setQuickOptionName] = useState('Báo giá nhanh');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickVat, setQuickVat] = useState<string>(String(PRICING_DEFAULTS.VAT_PCT));
  const [quickIncludeVat, setQuickIncludeVat] = useState<boolean>(true);
  const [calcLaborCost, setCalcLaborCost] = useState<string>(String(PRICING_DEFAULTS.LABOR_COST));
  // Tiền kiểm định Order nhập — dùng chung cho mọi phương án tính trong modal này, cộng vào
  // quotedPrice ở BE (không tính ở FE). Lưu vào QuoteRequest lúc gửi báo giá.
  const [calcInspectionFee, setCalcInspectionFee] = useState<string>('0');
  const [calcVat, setCalcVat] = useState<string>(String(PRICING_DEFAULTS.VAT_PCT));
  const [calcIncludeVat, setCalcIncludeVat] = useState<boolean>(true);
  const [calcSilverMultiplier, setCalcSilverMultiplier] = useState<number>(3);

  // Phương án "loại vàng khác" Order tự thêm để so sánh — KHÔNG còn tự sinh từ BE nữa. Mỗi dòng
  // chọn 1 chất liệu khác + PHẢI nhập khối lượng riêng (tuổi vàng khác nhau khối lượng khác nhau).
  // Tính riêng từng dòng qua /quote-options/calculate, gắn locked=true (chỉ tham khảo, không chọn
  // làm giá chính) cùng groupId với phương án chính.
  // Bật khi đã nạp SẴN chất liệu tham khảo THẬT từ đơn (Sale nhập lúc tạo đơn) — chặn chế độ tự
  // liệt kê vàng ghi đè/khóa mất dữ liệu thật đó (xem effect nạp options bên dưới).
  const [disableAutoGoldMode, setDisableAutoGoldMode] = useState(false);
  const { compareRows, setCompareRows, addCompareRow, updateCompareRow, removeCompareRow, autoGoldMode } = useCompareRows(dbMaterials, calcMaterialRows, disableAutoGoldMode);

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

    setCompareRows([]);
    setDisableAutoGoldMode(false);
    setCalcInspectionFee(selectedReq.inspectionFee != null ? String(selectedReq.inspectionFee) : '0');
    setPricingMode('calculator');
    setQuickOptionName('Báo giá nhanh');
    setQuickPrice('');
    setQuickVat(String(defaultVatRate));
    setQuickIncludeVat(true);

    // Bản nháp chưa có giá (VD: mỗi chất liệu Sale chọn lúc tạo đơn — BE tự tách thành 1 option
    // nháp/chất liệu, xem quote-requests.service.ts) không phải 1 phương án báo giá thật — không
    // đưa vào state options, tránh lệch số thứ tự "Phương án N" và bị gửi kèm lên BE lúc Xác Nhận,
    // tạo dư row quote_options rỗng. Order tính giá qua máy tính bên dưới (đã tự điền sẵn các chất
    // liệu này — xem khối load calcMaterialRows/compareRows ngay dưới), ra option thật thì mới hiện.
    const realOptions = (selectedReq.options || []).filter((opt) => opt.quotedPrice != null);
    if (realOptions.length > 0) {
      // Phương án Sale THẬT SỰ chọn — ưu tiên CLOSED/SELECTED; nếu đơn cũ/dữ liệu thiếu cờ này
      // (không option nào SELECTED/CLOSED) thì fallback về option ĐẦU TIÊN thay vì khóa hết —
      // khóa hết sẽ khiến Order không còn cách nào chọn giá chính để báo giá cho đơn đó.
      const salePrimaryOption = getPrimaryOption({ options: realOptions });
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
    const primaryOpt = getPrimaryOption({ options: selectedReq.options });
    const realOptionsList = (selectedReq.options || []).filter((opt) => opt.quotedPrice != null);
    
    let loadedRows: any[] = [];
    if (realOptionsList.length > 0) {
      // Đã có phương án tính giá thật — chỉ lấy nguyên liệu từ ĐÚNG phương án chính đó vào máy
      // tính. KHÔNG gộp vật liệu từ nhiều phương án đã có giá vào cùng 1 lần tính, sẽ trùng lặp
      // (ví dụ phương án chính và phương án đính kèm cùng dùng Vàng 10K).
      const targetOption = getPrimaryOption({ options: realOptionsList });
      if (targetOption?.materials) {
        targetOption.materials.forEach((m: QuoteOptionMaterial, mIdx: number) => {
          loadedRows.push({
            id: `m_${mIdx}_${Date.now()}`,
            materialId: m.materialId || m.id || '',
            materialName: m.materialName || m.material?.name || '',
            weightChi: m.weightChi != null ? String(m.weightChi) : '1.0',
          });
        });
      }
    } else if (selectedReq.options && selectedReq.options.length > 0) {
      // Chưa phương án nào có giá thật — mỗi option hiện có là 1 nháp BE tự tách, ĐÚNG 1 chất
      // liệu riêng mỗi option (không trùng nhau). Chất liệu ĐẦU TIÊN làm chính (calcMaterialRows),
      // các chất liệu còn lại tự điền vào "Phương án loại vàng khác" (compareRows) với ĐÚNG khối
      // lượng Sale đã chọn — Order bấm "Tính Giá Ngay" 1 lần ra đủ 1 phương án chính + các phương
      // án tham khảo, đúng khối máy tính so sánh sẵn có, không cần thêm khái niệm thẻ nháp mới.
      const draftMaterials: { materialId: string; materialName: string; weightChi: string }[] = [];
      selectedReq.options.forEach((opt: any) => {
        (opt.materials || []).forEach((m: QuoteOptionMaterial) => {
          draftMaterials.push({
            materialId: m.materialId || m.id || '',
            materialName: m.materialName || m.material?.name || '',
            weightChi: m.weightChi != null ? String(m.weightChi) : '1.0',
          });
        });
      });
      if (draftMaterials.length > 0) {
        const [first, ...rest] = draftMaterials;
        loadedRows.push({ id: `m_0_${Date.now()}`, ...first });
        if (rest.length > 0) {
          setCompareRows(
            rest.map((m, idx) => ({
              id: `cmp_draft_${idx}_${Date.now()}`,
              materialId: m.materialId,
              materialName: m.materialName,
              weightChi: m.weightChi,
            })),
          );
          setDisableAutoGoldMode(true);
        }
      }
    }

    if (loadedRows.length > 0) {
      setCalcMaterialRows(loadedRows);
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
      // Dựng lại danh sách đá từ dữ liệu BE — giữ lại dbId/dbParentStoneId thật để map nhóm.
      const loadedRows = primaryOpt.stones.map((s: QuoteOptionStone, idx: number) => {
        const catalogMatch = stoneCatalog.find((c) => c.id === s.stoneId);
        return {
          localId: `stone_${idx}_${Date.now()}`,
          dbId: s.id,
          dbParentStoneId: s.parentStoneId ?? null,
          stoneType: (s.stoneType || s.stone?.stoneType || catalogMatch?.stoneType || '') as 'MAIN' | 'SIDE' | '',
          stoneId: s.stoneId,
          stoneName: s.stoneName || s.stone?.name || catalogMatch?.name,
          qty: s.quantity || 1,
        };
      });
      const loadedMainRows = loadedRows.filter((r) => r.stoneType === 'MAIN');
      const loadedSideRows = loadedRows.filter((r) => r.stoneType === 'SIDE');
      // Dòng nào cũng có dbId thật (id luôn tồn tại kể cả dữ liệu cũ) — không dùng để phân biệt
      // được. Chỉ tin dbParentStoneId khi có ÍT NHẤT 1 đá tấm mang giá trị thật — option lưu SAU
      // khi có cột parent_stone_id mới có, option lưu TRƯỚC đó (dù mới hay cũ) luôn toàn NULL.
      const hasRealGroupingData = loadedSideRows.length > 0 && loadedSideRows.some((r) => r.dbParentStoneId);
      const dbIdToLocalId = new Map(loadedRows.map((r) => [r.dbId, r.localId]));

      let finalStoneRows: StoneRow[];
      if (hasRealGroupingData) {
        // Dữ liệu mới: map thẳng 1-1, SIDE nào có dbParentStoneId thật thì trỏ đúng local id của
        // đá chủ đó; không có (orphan) thì giữ nguyên không parentId.
        finalStoneRows = loadedRows.map((r) => ({
          id: r.localId,
          stoneType: r.stoneType,
          stoneId: r.stoneId,
          stoneName: r.stoneName,
          qty: r.qty,
          ...(r.stoneType === 'SIDE' && r.dbParentStoneId && dbIdToLocalId.has(r.dbParentStoneId)
            ? { parentId: dbIdToLocalId.get(r.dbParentStoneId)! }
            : {}),
        }));
      } else if (loadedMainRows.length > 0 && loadedSideRows.length > 0) {
        // Dữ liệu CŨ (lưu trước khi có cột parent_stone_id) — fallback: gắn hết đá tấm cho mọi
        // đá chủ như trước đây (không biết đá tấm nào thuộc đá chủ nào).
        finalStoneRows = [
          ...loadedMainRows.map((r) => ({ id: r.localId, stoneType: r.stoneType, stoneId: r.stoneId, stoneName: r.stoneName, qty: r.qty })),
          ...loadedMainRows.flatMap((mainRow) =>
            loadedSideRows.map((tpl, idx) => ({
              id: `stone_side_${mainRow.localId}_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              stoneType: tpl.stoneType,
              stoneId: tpl.stoneId,
              stoneName: tpl.stoneName,
              qty: tpl.qty,
              parentId: mainRow.localId,
            })),
          ),
        ];
      } else {
        finalStoneRows = loadedRows.map((r) => ({ id: r.localId, stoneType: r.stoneType, stoneId: r.stoneId, stoneName: r.stoneName, qty: r.qty }));
      }
      setCalcStoneRows(finalStoneRows);
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
  }, [isOpen, selectedReq, dbMaterials, stoneCatalog, defaultVatRate, setCalcMaterialRows, setCalcStoneRows, setCompareRows]);

  // Đổi chất liệu/khối lượng/đá hoặc tiền công/VAT sau khi đã bấm "Tính Giá Ngay" — chỉ xóa lỗi cũ.
  // Kết quả tính đã được thêm thẳng vào "Các Phương Án Báo Giá" ngay khi tính xong (xem
  // handleRunCalculate), không còn ở trạng thái xem trước nên không cần xóa gì thêm ở đây.
  useEffect(() => {
    setCalcError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMaterialRows, calcSilverMultiplier, calcStoneRows, calcStoneMode, calcManualStonePrice, calcManualStoneName, calcLaborCost, calcVat, calcIncludeVat]);

  if (!isOpen) return null;

  // Gộp thẳng phương án mới tính được vào "Các Phương Án Báo Giá" (không có bước xem trước/bấm
  // "Thêm" thủ công). Tính lại cùng 1 chất liệu (materialId trùng) thì THAY giá cũ, không tách
  // thành card riêng. Nếu danh sách chưa có phương án nào được chọn, phương án ĐẦU TIÊN không bị
  // khóa tự động được chọn làm giá chính.
  // skipDedup: báo giá nhanh (nhập tay) không có "tổ hợp" để gộp lại — mỗi lần bấm thêm là 1
  // phương án riêng dù trùng chất liệu/đá với phương án trước, luôn thêm mới chứ không thay giá cũ.
  const addOptionsToList = (newOpts: QuoteOption[], opts: { skipDedup?: boolean } = {}) => {
    setOptions((prev) => {
      // Khóa gồm cả chất liệu lẫn tổ hợp đá chủ đính kèm — 1 chất liệu có thể ra nhiều phương án
      // khác nhau theo từng tổ hợp đá chủ (stoneCombos), không được gộp các tổ hợp khác nhau lại.
      const keyOf = (o: QuoteOption) => {
        const matKey = o.materials?.[0]?.materialId || o.materialName || '';
        const stoneKey = (o.stones || []).map((s) => s.stoneId).sort().join(',');
        return `${matKey}|${stoneKey}`;
      };
      const next = [...prev];
      newOpts.forEach((opt) => {
        if (opt.quotedPrice == null) return;
        if (opts.skipDedup) {
          next.push(opt);
          return;
        }
        const key = keyOf(opt);
        const existingIdx = key ? next.findIndex((o) => keyOf(o) === key) : -1;
        if (existingIdx >= 0) {
          next[existingIdx] = { ...opt, isSelected: next[existingIdx].isSelected };
        } else {
          next.push(opt);
        }
      });
      const hasSelected = next.some((o) => o.isSelected);
      if (!hasSelected) {
        const firstSelectable = next.find((o) => !o.locked);
        if (firstSelectable) firstSelectable.isSelected = true;
      }
      return next;
    });
  };

  // Map 1 kết quả từ /quote-options/calculate-batch thành QuoteOption — dùng chung
  // batchResultToOption (utils/quoteOption), chỉ đặt tên/note đặc thù màn này.
  const mapOption = (
    materialName: string,
    materialId: string | undefined,
    weightChi: number,
    res: CalculateBatchResultItem | undefined,
    ctx: {
      laborCost: number;
      vatVal: number;
      stoneSelections?: { stoneId: string; quantity: number; parentIndex?: number }[];
      stoneDesc: string;
      groupId: string;
      locked: boolean;
      // Có từ 2 tổ hợp đá chủ trở lên — thêm tên đá vào optionName để phân biệt các phương án
      // cùng chất liệu nhưng khác đá chủ.
      stoneSuffix?: string;
    },
  ): QuoteOption | null =>
    batchResultToOption({
      optionName: ctx.locked
        ? ctx.stoneSuffix
          ? `${materialName} · ${weightChi} chỉ · Loại chất liệu khác · ${ctx.stoneSuffix}`
          : `${materialName} · ${weightChi} chỉ · Loại chất liệu khác (tham khảo)`
        : ctx.stoneSuffix
          ? `${materialName} · ${weightChi} chỉ · ${ctx.stoneSuffix}`
          : `${materialName} · ${weightChi} chỉ`,
      materialName,
      materialId,
      weightChi,
      res,
      vat: ctx.vatVal,
      locked: ctx.locked,
      groupId: ctx.groupId,
      stones: ctx.stoneSelections,
      stoneDescription: ctx.stoneDesc,
      note: ctx.locked ? 'Loại chất liệu khác — chỉ tham khảo' : 'Tính từ máy tính giá',
    });

  const handleRunCalculate = async () => {
    const validRows = calcMaterialRows.filter(
      (m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0,
    );
    if (validRows.length === 0) {
      setCalcError('Vui lòng chọn ít nhất 1 chất liệu và nhập trọng lượng hợp lệ');
      return;
    }

    // Dòng "loại chất liệu khác" đã chọn chất liệu nhưng CHƯA nhập khối lượng — bắt buộc nhập. Không áp
    // dụng ở chế độ tự liệt kê chất liệu (autoGoldMode): phần lớn dòng auto rỗng theo thiết kế — bỏ qua
    // lúc tính chứ không phải lỗi nhập thiếu.
    if (
      !autoGoldMode &&
      compareRows.some((r) => r.materialId && !((parseFloat(r.weightChi) || 0) > 0))
    ) {
      setCalcError('Nhập khối lượng (chỉ) cho phương án loại chất liệu khác');
      return;
    }

    setCalcLoading(true);
    setCalcError(null);
    try {
      const l = parseFloat(calcLaborCost) || 0;
      const vatVal = calcIncludeVat ? (parseFloat(calcVat) || 10) : 0;

      // Đá nhập tay → gửi thẳng số. Đá chọn từ danh mục → gửi danh sách stones cho BE tự cộng
      // (FE KHÔNG tự nhân đơn giá × số lượng nữa).
      const manualStoneCost =
        calcStoneMode === 'manual' ? parseFloat(calcManualStonePrice) || 0 : 0;

      // Đá CHỦ (MAIN) mỗi dòng là 1 trục so sánh riêng — giống chất liệu (khớp computeLibraryGroupKey
      // ở BE cũng chỉ định danh sản phẩm theo đá MAIN, đá TẤM chỉ là chi tiết phụ). Đá TẤM (SIDE)
      // đính kèm RIÊNG cho đúng đá chủ cha (parentId) — không còn dùng chung cho mọi đá chủ.
      const mainStoneRows =
        calcStoneMode === 'catalog' ? calcStoneRows.filter((r) => r.stoneId && r.stoneType === 'MAIN') : [];
      const mainStoneRowIds = new Set(mainStoneRows.map((r) => r.id));
      // Đá tấm không gắn đúng 1 đá chủ hợp lệ (chưa gắn, hoặc đá chủ cha chưa chọn sản phẩm) — tự
      // thành 1 phương án riêng (chỉ có đá tấm, không đá chủ), KHÔNG cộng dồn vào các đá chủ khác.
      const orphanSideSelections =
        calcStoneMode === 'catalog'
          ? calcStoneRows
              .filter((r) => r.stoneId && r.stoneType === 'SIDE' && !(r.parentId && mainStoneRowIds.has(r.parentId)))
              .map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
          : [];
      const sideStonesOfMain = (mainRowId: string) =>
        calcStoneRows
          .filter((r) => r.stoneId && r.stoneType === 'SIDE' && r.parentId === mainRowId)
          .map((r) => ({ stoneId: r.stoneId, quantity: r.qty, parentIndex: 0 }));
      // Tên phương án chỉ hiện đá CHỦ (kèm lát cắt + size), không ghép tên đá tấm vào — trừ tổ hợp
      // không có đá chủ (orphanSideSelections bên dưới), lúc đó phải ghi rõ là đá tấm gì.
      const mainStoneLabel = (stoneId: string) => {
        const s = stoneCatalog.find((c) => c.id === stoneId);
        return s ? [s.name, s.cut, s.size].filter(Boolean).join(' - ') : stoneName(stoneId);
      };
      const stoneCombos: { stoneSelections?: { stoneId: string; quantity: number; parentIndex?: number }[]; stoneDesc: string }[] = [
        ...mainStoneRows.map((mainRow) => ({
          stoneSelections: [{ stoneId: mainRow.stoneId, quantity: mainRow.qty }, ...sideStonesOfMain(mainRow.id)],
          stoneDesc: mainStoneLabel(mainRow.stoneId),
        })),
        ...(orphanSideSelections.length > 0
          ? [
              {
                stoneSelections: orphanSideSelections,
                stoneDesc: `Đá tấm: ${orphanSideSelections.map((s) => mainStoneLabel(s.stoneId)).join(', ')}`,
              },
            ]
          : []),
      ];
      if (stoneCombos.length === 0) {
        stoneCombos.push({
          stoneSelections: undefined,
          stoneDesc: calcStoneMode === 'manual' ? calcManualStoneName : '',
        });
      }

      // Các dòng "loại vàng khác" hợp lệ (đã chọn chất liệu + nhập khối lượng > 0).
      const compareValid = compareRows.filter(
        (r) => r.materialId && (parseFloat(r.weightChi) || 0) > 0,
      );
      // (chất liệu so sánh) × (tổ hợp đá chủ) — giống mainItems, không còn tính riêng 1 lần với
      // list đá phẳng chung nữa: mỗi đá chủ vẫn phải ra 1 phương án so sánh riêng cho từng chất liệu.
      const compareItems: {
        materialNameOrKey: string;
        weightChi: number;
        laborCost: number;
        stoneCost?: number;
        stones?: { stoneId: string; quantity: number; parentIndex?: number }[];
        vatRate: number;
        silverMultiplier?: number;
      }[] = [];
      const compareItemMeta: { row: (typeof compareValid)[number]; combo: (typeof stoneCombos)[number] }[] = [];
      compareValid.forEach((r) => {
        stoneCombos.forEach((combo) => {
          compareItems.push({
            materialNameOrKey: r.materialName,
            weightChi: parseFloat(r.weightChi) || 0,
            laborCost: l,
            stoneCost: manualStoneCost || undefined,
            stones: combo.stoneSelections,
            vatRate: vatVal,
            // BE chỉ áp hệ số nhân cho chất liệu dùng công thức MULTIPLIER (Bạc); gửi luôn cũng an toàn.
            silverMultiplier: isSilverMaterialId(r.materialId) ? calcSilverMultiplier : undefined,
          });
          compareItemMeta.push({ row: r, combo });
        });
      });

      // Bấm "Tính Giá Ngay" lại cho cùng 1 chất liệu (giá có thể đổi) — khớp theo materialId thay
      // vì giá, để nhận đúng groupId cũ (addOptionsToList sẽ thay giá, không tách card mới).
      const resolveGroupId = (materialId: string | undefined): string => {
        const existing = options.find(
          (o) => !o.locked && o.materials?.[0]?.materialId === materialId,
        );
        return existing?.groupId || `g_${Date.now()}`;
      };

      // Mỗi (chất liệu × tổ hợp đá) là 1 phương án độc lập — validRows.length === 1 &&
      // stoneCombos.length === 1 thì ra đúng 1 item, y hệt hành vi cũ trước khi có đá chủ tách riêng.
      const mainItems: {
        materialNameOrKey: string;
        weightChi: number;
        laborCost: number;
        stoneCost?: number;
        stones?: { stoneId: string; quantity: number; parentIndex?: number }[];
        vatRate: number;
        silverMultiplier?: number;
      }[] = [];
      const mainItemMeta: { row: (typeof validRows)[number]; combo: (typeof stoneCombos)[number] }[] = [];
      validRows.forEach((r) => {
        stoneCombos.forEach((combo) => {
          mainItems.push({
            materialNameOrKey: r.materialName,
            weightChi: parseFloat(r.weightChi) || 0,
            laborCost: l,
            stoneCost: manualStoneCost || undefined,
            stones: combo.stoneSelections,
            vatRate: vatVal,
            silverMultiplier: isSilverMaterialId(r.materialId || r.id) ? calcSilverMultiplier : undefined,
          });
          mainItemMeta.push({ row: r, combo });
        });
      });

      const results = await calculatePriceBatchApi({
        categoryId: selectedReq?.category?.id || undefined,
        includeVat: calcIncludeVat,
        inspectionFee: parseFloat(calcInspectionFee) || 0,
        items: [...mainItems, ...compareItems],
      });

      const newOpts: QuoteOption[] = [];
      let primaryGroupId = '';

      mainItems.forEach((item, idx) => {
        const resItem = results[idx];
        if (resItem.error) {
          setCalcError(resItem.error);
          return;
        }
        const { row, combo } = mainItemMeta[idx];
        const gid = resolveGroupId(row.materialId || row.id);
        if (idx === 0) primaryGroupId = gid;
        const opt = mapOption(
          item.materialNameOrKey,
          row.materialId || row.id,
          item.weightChi,
          resItem,
          {
            laborCost: l,
            vatVal,
            stoneSelections: combo.stoneSelections,
            stoneDesc: combo.stoneDesc,
            groupId: gid,
            locked: false,
            stoneSuffix: stoneCombos.length > 1 ? combo.stoneDesc : undefined,
          }
        );
        if (opt) newOpts.push(opt);
      });

      if (newOpts.length === 0) {
        return;
      }

      const compareOpts = compareItems.map((item, idx) => {
        const resItem = results[mainItems.length + idx];
        const { row, combo } = compareItemMeta[idx];
        return mapOption(row.materialName, row.materialId, item.weightChi, resItem, {
           laborCost: l,
           vatVal,
           stoneSelections: combo.stoneSelections,
           stoneDesc: combo.stoneDesc,
           groupId: primaryGroupId,
           locked: true,
           stoneSuffix: stoneCombos.length > 1 ? combo.stoneDesc : undefined,
        });
      }).filter((o): o is QuoteOption => !!o);

      addOptionsToList([...newOpts, ...compareOpts]);
      } catch (err: any) {
      console.error('Lỗi tính giá:', err);
      setCalcError(err.message || 'Lỗi khi tính giá');
    } finally {
      setCalcLoading(false);
    }
  };

  // Gộp 1 phương án "báo giá nhanh" (optionName + quotedPrice + vat, KHÔNG gọi API tính giá nào)
  // vào "Các Phương Án Báo Giá" — vẫn đính kèm đúng chất liệu/đá Sale đã yêu cầu lúc tạo đơn (đang
  // nằm sẵn trong calcMaterialRows/calcStoneRows do effect mở modal nạp vào), chỉ bỏ qua bước tính
  // giá theo công thức, không bỏ luôn thông tin chất liệu/đá.
  const handleAddQuickOption = () => {
    const price = parseFloat(quickPrice) || 0;
    if (price <= 0) {
      setCalcError('Vui lòng nhập số tiền báo giá hợp lệ');
      return;
    }
    setCalcError(null);

    const validMaterialRows = calcMaterialRows.filter(
      (m) => m.materialId && (parseFloat(m.weightChi) || 0) > 0,
    );
    const materials = validMaterialRows.map((m) => ({
      materialId: m.materialId,
      weightChi: parseFloat(m.weightChi) || 0,
    }));
    const materialNameDisplay = validMaterialRows.map((m) => m.materialName).join(', ');

    // Báo giá nhanh gộp CẢ calcStoneRows (có thể nhiều nhóm đá chủ/đá tấm khác nhau) vào 1 option
    // duy nhất — khác máy tính giá (mỗi đá chủ tách 1 option riêng) nên phải tự tính parentIndex
    // theo VỊ TRÍ thật trong mảng đang gửi (không cố định 0 như bên máy tính giá).
    const validStoneRows = calcStoneMode === 'catalog' ? calcStoneRows.filter((r) => r.stoneId) : [];
    const stoneSelections =
      validStoneRows.length > 0
        ? validStoneRows.map((r) => {
            const parentIdx = r.parentId ? validStoneRows.findIndex((other) => other.id === r.parentId) : -1;
            return {
              stoneId: r.stoneId,
              quantity: r.qty,
              ...(parentIdx >= 0 ? { parentIndex: parentIdx } : {}),
            };
          })
        : undefined;

    addOptionsToList([
      {
        optionName: quickOptionName.trim() || 'Báo giá nhanh',
        materialName: materialNameDisplay || undefined,
        weightChi: validMaterialRows.length === 1 ? parseFloat(validMaterialRows[0].weightChi) || 0 : undefined,
        materials: materials.length > 0 ? materials : undefined,
        stones: stoneSelections,
        stoneDescription: calcStoneMode === 'manual' ? (calcManualStoneName || undefined) : undefined,
        stoneCost: calcStoneMode === 'manual' ? (parseFloat(calcManualStonePrice) || 0) : undefined,
        quotedPrice: price,
        vat: quickIncludeVat ? parseFloat(quickVat) || 0 : 0,
        groupId: `g_${Date.now()}`,
      },
    ], { skipDedup: true });
    setQuickPrice('');
  };

  const handleSelectOption = (idx: number) => {
    setOptions((prev) => {
      const chosen = prev[idx];
      // Order chọn 1 phương án Order TỰ TÍNH (không thuộc cụm 'sale') thay cho giá Sale đề xuất —
      // giá Sale coi như bị thay thế hẳn, bỏ luôn khỏi danh sách (giữ nguyên hành vi cũ này).
      const base = chosen && chosen.groupId !== 'sale'
        ? prev.filter((o) => o.groupId !== 'sale')
        : prev;
      return base.map((opt) => (opt === chosen ? { ...opt, isSelected: !opt.isSelected } : opt));
    });
  };

  const handleRemoveOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOpts = options.filter(
      (o) => o.isSelected && typeof o.quotedPrice === 'number' && Number(o.quotedPrice) > 0,
    );
    if (selectedOpts.length === 0) {
      alert('Vui lòng chọn ít nhất 1 phương án báo giá để gửi!');
      return;
    }

    // primaryPrice/primaryVat: tham số legacy cho onSubmit() — completeQuoteRequest ở BE
    // nhận rồi dùng options[] là chính, nhưng vẫn cần truyền 1 giá trị hợp lệ.
    const primaryPrice = selectedOpts[0].quotedPrice;
    const primaryVat = selectedOpts[0].vat != null ? Number(selectedOpts[0].vat) : defaultVatRate;

    setSubmitting(true);
    try {
      await onSubmit(primaryPrice, primaryVat, options, { inspectionFee: parseFloat(calcInspectionFee) || 0 });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu báo giá');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedOpts = options.filter(
    (o) => o.isSelected && typeof o.quotedPrice === 'number' && Number(o.quotedPrice) > 0,
  );
  const hasValidPrice = selectedOpts.length > 0;

  const isSilverPresent = calcMaterialRows.some((m) => isSilverMaterialId(m.materialId || m.id));

  // Ẩn option nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu, quotedPrice null)
  // khỏi danh sách hiển thị/đếm số — chỉ phương án đã tính giá thật mới coi là 1 phương án báo giá.
  // Giữ nguyên idx gốc trong mảng options để các handler chọn/xóa vẫn hoạt động đúng.
  const pricedOptions = options
    .map((opt, idx) => ({ opt, idx }))
    .filter(({ opt }) => opt.quotedPrice != null);

  const allPricedSelected = pricedOptions.length > 0 && pricedOptions.every(({ opt }) => opt.isSelected);
  const handleToggleSelectAll = () => {
    const pricedIdxSet = new Set(pricedOptions.map(({ idx }) => idx));
    const nextSelected = !allPricedSelected;
    setOptions((prev) => prev.map((opt, i) => (pricedIdxSet.has(i) ? { ...opt, isSelected: nextSelected } : opt)));
  };

  return (
    <div className={modalBackdropCls}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Báo giá yêu cầu ${selectedReq?.code || ''}`.trim()}
        tabIndex={-1}
        className={clsx(modalCardCls, '!max-w-[860px] !w-[95%] !max-h-[92vh] overflow-y-auto')}
      >
        <div className={clsx(modalHeaderCls, '!py-[16px] !px-[20px]')}>
          <div>
            <h2 className="m-0 text-[20px] font-extrabold text-[#0f172a]">
              Báo Giá Yêu Cầu {selectedReq?.code || ''}
            </h2>
            <span className="text-[15px] text-muted">
              Khách: <strong>{selectedReq?.customer?.name || 'Khách vãng lai'}</strong> — Danh mục: <strong>{selectedReq?.category?.name || '---'}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={modalCloseIconBtnCls}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[16px] p-[20px]">
          
          <div className="bg-surface border border-border rounded-[14px] p-[16px]">
            <div className="flex items-center justify-between mb-[12px]">
              <div className="flex items-center gap-[8px]">
                <Layers size={18} color="#d97706" />
                <h3 className="text-[18px] font-extrabold text-[#0f172a] m-0">
                  Các Phương Án Báo Giá ({pricedOptions.length})
                </h3>
              </div>
              <div className="flex items-center gap-[10px]">
                <span className="text-[14.5px] text-muted">
                  Chọn các phương án muốn gửi báo giá cho khách
                </span>
                {pricedOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[6px] py-[4px] px-[10px] text-[14px] font-extrabold text-[#0f172a] cursor-pointer"
                  >
                    {allPricedSelected ? 'Bỏ chọn hết' : 'Chọn hết'}
                  </button>
                )}
              </div>
            </div>

            {pricedOptions.length === 0 ? (
              <div className="bg-[#f8fafc] p-[16px] rounded-[10px] text-center text-muted text-[16px]">
                Chưa có phương án nào. Hãy dùng bảng máy tính bên dưới và bấm <strong>"Tính Giá Ngay"</strong> — phương án sẽ tự hiện lên đây.
              </div>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {pricedOptions.map(({ opt, idx }) => {
                  return (
                    <div
                      key={idx}
                      className={clsx(
                        'rounded-[10px] transition-[all_0.15s_ease]',
                        opt.isSelected ? 'bg-[#f0fdf4] border-[1.5px] border-[#16a34a]' : 'bg-[#f8fafc] border border-border'
                      )}
                    >
                      <div
                        onClick={() => handleSelectOption(idx)}
                        className="flex items-center justify-between gap-[12px] py-[12px] px-[14px] cursor-pointer"
                      >
                        <div className="flex items-center gap-[10px] min-w-0">
                          <input
                            type="checkbox"
                            checked={!!opt.isSelected}
                            onChange={() => handleSelectOption(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[16px] h-[16px] accent-[#16a34a] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-[16.5px] font-extrabold text-[#0f172a]">
                              {opt.optionName || `Phương án ${idx + 1}`}
                              {opt.isSelected && (
                                <span className="ml-[8px] bg-[#16a34a] text-surface text-[13px] font-extrabold py-[2px] px-[8px] rounded-[20px]">
                                  ĐÃ CHỌN
                                </span>
                              )}
                            </div>
                            <div className="text-[15px] text-muted mt-[2px]">
                              {opt.materialName ? `Chất liệu: ${opt.materialName}` : ''}
                              {opt.weightChi ? ` · ${opt.weightChi} chỉ` : ''}
                              {opt.vat != null ? ` · VAT ${opt.vat}%` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-[12px] shrink-0">
                        <div className="flex flex-col items-end">
                          <strong className="text-[19px] font-black text-[#16a34a] tabular-nums">
                            {formatCurrency(opt.quotedPrice)}
                          </strong>
                          {renderPriceBreakdownLines(getPriceBreakdown(opt))}
                          {renderCostBreakdownLines(getCostBreakdown(opt))}
                        </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveOption(idx);
                            }}
                            title="Xóa phương án này"
                            className="bg-[#fee2e2] border-0 text-[#dc2626] w-[28px] h-[28px] rounded-[6px] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KHỐI 2: MÁY TÍNH BÁO GIÁ / TẠO PHƯƠNG ÁN MỚI (DẠNG NHƯ BÊN CALCULATOR) */}
          <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-[14px] p-[16px]">
            <div
              className={clsx(
                'flex items-center justify-between cursor-pointer',
                showCalculator ? 'mb-[14px]' : 'mb-0'
              )}
              onClick={() => setShowCalculator((prev) => !prev)}
            >
              <div className="flex items-center gap-[8px]">
                <Calculator size={18} color="#2563eb" />
                <h3 className="text-[18px] font-extrabold text-[#0f172a] m-0">
                  Máy Tính Báo Giá / Tạo Phương Án Mới
                </h3>
              </div>
              <button
                type="button"
                className="bg-transparent border-0 text-muted cursor-pointer"
              >
                {showCalculator ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {showCalculator && (
              <div className="flex flex-col gap-[14px]">
                {/* Tab chọn chế độ: Máy Tính (tính theo chất liệu/đá) hoặc Báo Giá Nhanh (Order gõ
                    thẳng tổng tiền cho yêu cầu, không qua công thức nào). */}
                <div className="flex gap-[6px]">
                  <button
                    type="button"
                    onClick={() => setPricingMode('calculator')}
                    className={clsx(
                      'flex items-center gap-[6px] py-[6px] px-[12px] rounded-[6px] text-[14.5px] font-extrabold cursor-pointer',
                      pricingMode === 'calculator'
                        ? 'border border-[#0f172a] bg-[#0f172a] text-surface'
                        : 'border border-[#cbd5e1] bg-surface text-[#334155]'
                    )}
                  >
                    <Calculator size={14} /> Máy Tính
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode('quick')}
                    className={clsx(
                      'flex items-center gap-[6px] py-[6px] px-[12px] rounded-[6px] text-[14.5px] font-extrabold cursor-pointer',
                      pricingMode === 'quick'
                        ? 'border border-[#0f172a] bg-[#0f172a] text-surface'
                        : 'border border-[#cbd5e1] bg-surface text-[#334155]'
                    )}
                  >
                    <Zap size={14} /> Báo Giá Nhanh
                  </button>
                </div>

                {pricingMode === 'quick' ? (
                  <div className="flex flex-col gap-[14px]">
                    <div className="grid grid-cols-[1fr_150px] gap-[12px]">
                      <div>
                        <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                          Tên Phương Án
                        </label>
                        <input
                          type="text"
                          value={quickOptionName}
                          onChange={(e) => setQuickOptionName(e.target.value)}
                          maxLength={200}
                          placeholder="Báo giá nhanh"
                          className="w-full py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface"
                        />
                      </div>
                      <div>
                        <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                          Thuế VAT (%)
                        </label>
                        <div className="flex items-center gap-[8px]">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={quickVat}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v !== '' && parseFloat(v) < 0) return;
                              setQuickVat(v);
                            }}
                            className="w-[60px] py-[8px] px-[10px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface"
                          />
                          <label className="text-[14px] text-[#334155] font-bold flex items-center gap-[4px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quickIncludeVat}
                              onChange={(e) => setQuickIncludeVat(e.target.checked)}
                              className="w-[15px] h-[15px] accent-primary"
                            />
                            Cộng
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                        Tổng Tiền Báo Giá (₫)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberVN(quickPrice)}
                        onChange={(e) => setQuickPrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        className="w-full py-[10px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[18px] font-extrabold bg-surface"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      {calcError ? (
                        <span className="text-[#dc2626] text-[15px] font-bold">{calcError}</span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={handleAddQuickOption}
                        className="bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-[#78350f] border-0 rounded-[8px] py-[10px] px-[20px] text-[16px] font-extrabold cursor-pointer shadow-[0_2px_6px_rgba(245,158,11,0.3)]"
                      >
                        Thêm Vào Danh Sách
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* 1. Chất liệu & Khối lượng */}
                <div>
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className={labelUppercaseCls}>
                      Chất Liệu Chế Tác & Khối Lượng (Chỉ)
                    </label>
                    {/* Order không được đổi chất liệu Sale đã yêu cầu — modal này luôn xử lý 1 đơn
                        có sẵn (selectedReq), nên khóa hẳn khả năng thêm dòng chất liệu mới. */}
                    {!selectedReq && (
                      <button
                        type="button"
                        onClick={addMaterialRow}
                        className="flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[6px] py-[4px] px-[10px] text-[14.5px] font-extrabold text-[#0f172a] cursor-pointer"
                      >
                        <Plus size={13} /> Thêm chất liệu
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-[8px]">
                    {calcMaterialRows.map((row) => (
                      <div
                        key={row.id}
                        className={clsx(
                          'grid gap-[10px] items-center',
                          calcMaterialRows.length > 1 && !selectedReq ? 'grid-cols-[1fr_140px_32px]' : 'grid-cols-[1fr_140px]'
                        )}
                      >
                        <select
                          // Ép remount khi dbMaterials load xong (từ [] sang có data) — nếu không, React
                          // không tự sync lại DOM <select> vì chuỗi value không đổi giữa 2 lần render,
                          // dù <option> khớp giờ đã tồn tại (dropdown hiện trống dù value đúng).
                          key={dbMaterials.length}
                          value={row.materialId}
                          onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                          className="py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface cursor-pointer"
                        >
                          {dbMaterials
                            // Từ 2 dòng chất liệu trở lên -> chỉ cho chọn cùng nhóm kim loại gốc với
                            // các dòng còn lại (không trộn Vàng với Bạc/Bạch kim...).
                            .filter((mat) => !lockedMaterialGroupKey || materialGroupKey(mat) === lockedMaterialGroupKey)
                            .map((mat) => (
                              <option key={mat.id} value={mat.id}>
                                {mat.name}
                              </option>
                            ))}
                        </select>

                        <div className="relative">
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
                            className="w-full pt-[8px] pr-[38px] pb-[8px] pl-[10px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface tabular-nums"
                          />
                          <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[14px] text-muted font-bold">
                            chỉ
                          </span>
                        </div>

                        {calcMaterialRows.length > 1 && !selectedReq && (
                          <button
                            type="button"
                            onClick={() => removeMaterialRow(row.id)}
                            className="h-[32px] w-[32px] rounded-[6px] border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1b. Phương án loại vàng khác — Order tự thêm để so sánh. KHÔNG còn tự sinh từ
                    BE. Mỗi loại vàng PHẢI nhập khối lượng riêng; kết quả là option "chỉ tham khảo"
                    (locked), không chọn được làm giá chính. */}
                <div>
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className={labelUppercaseCls}>
                      Phương án chất liệu khác (tham khảo)
                    </label>
                    {!autoGoldMode && (
                      <button
                        type="button"
                        onClick={addCompareRow}
                        className="flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[6px] py-[4px] px-[10px] text-[14.5px] font-extrabold text-[#0f172a] cursor-pointer"
                      >
                        <Plus size={13} /> Thêm phương án
                      </button>
                    )}
                  </div>

                  {compareRows.length === 0 ? (
                    <p className="text-[14.5px] text-faint m-0">
                      Thêm chất liệu khác để báo khách tham khảo — mỗi loại phải nhập khối lượng riêng.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-[8px]">
                      {compareRows.map((row) => (
                        <div
                          key={row.id}
                          className={clsx(
                            'grid gap-[10px] items-center',
                            autoGoldMode ? 'grid-cols-[1fr_140px]' : 'grid-cols-[1fr_140px_32px]',
                          )}
                        >
                          {autoGoldMode ? (
                            <span className="py-[8px] px-[12px] text-[16px] font-bold text-[#0f172a]">{row.materialName}</span>
                          ) : (
                            <select
                              key={dbMaterials.length}
                              value={row.materialId}
                              onChange={(e) => updateCompareRow(row.id, { materialId: e.target.value })}
                              className="py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface cursor-pointer"
                            >
                              {dbMaterials.map((mat) => (
                                <option key={mat.id} value={mat.id}>
                                  {mat.name}
                                </option>
                              ))}
                            </select>
                          )}

                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.weightChi}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v !== '' && parseFloat(v) < 0) return;
                                updateCompareRow(row.id, { weightChi: v });
                              }}
                              placeholder="Số chỉ"
                              className="w-full pt-[8px] pr-[38px] pb-[8px] pl-[10px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface tabular-nums"
                            />
                            <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[14px] text-muted font-bold">
                              chỉ
                            </span>
                          </div>

                          {!autoGoldMode && (
                            <button
                              type="button"
                              onClick={() => removeCompareRow(row.id)}
                              className="h-[32px] w-[32px] rounded-[6px] border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Tiền kiểm định, tiền công & VAT — cùng 1 dòng. Tiền kiểm định + tiền công chia
                    đều, VAT nhỏ bên phải (chỉ chứa số % + checkbox "Cộng"). */}
                <div className="grid grid-cols-[1fr_1fr_150px] gap-[12px]">
                  <div>
                    <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                      Tiền Kiểm Định (₫)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberVN(calcInspectionFee)}
                      onChange={(e) => setCalcInspectionFee(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-full py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface"
                    />
                  </div>

                  <div>
                    <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                      Tiền Công Chế Tác (₫)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberVN(calcLaborCost)}
                      onChange={(e) => setCalcLaborCost(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-full py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface"
                    />
                  </div>

                  <div>
                    <label className={clsx(labelUppercaseCls, 'block mb-[4px]')}>
                      Thuế VAT (%)
                    </label>
                    <div className="flex items-center gap-[8px]">
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
                        className="w-[65px] py-[8px] px-[10px] rounded-[8px] border border-[#cbd5e1] text-[16px] font-bold bg-surface"
                      />
                      <label className="text-[15px] text-[#334155] font-bold flex items-center gap-[4px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={calcIncludeVat}
                          onChange={(e) => setCalcIncludeVat(e.target.checked)}
                          className="w-[15px] h-[15px] accent-primary"
                        />
                        Cộng
                      </label>
                    </div>
                  </div>
                </div>

                {/* Hệ số nhân Bạc (nếu có Bạc) */}
                {isSilverPresent && (
                  <div className="flex items-center gap-[10px] py-[8px] px-[12px] bg-surface rounded-[8px] border border-[#cbd5e1]">
                    <label className={labelUppercaseCls}>Hệ số nhân Bạc:</label>
                    <select
                      value={calcSilverMultiplier}
                      onChange={(e) => setCalcSilverMultiplier(parseFloat(e.target.value) || 3)}
                      className="py-[4px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[15.5px] font-bold"
                    >
                      {silverMultipliers.map((m) => (
                        <option key={m} value={m}>× {m}</option>
                      ))}
                      {silverMultipliers.length === 0 && <option value={3}>× 3</option>}
                    </select>
                  </div>
                )}

                {/* 3. Đá quý */}
                <div className="bg-surface border border-border rounded-[10px] p-[12px]">
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className={labelUppercaseCls}>
                      Thông Số Đá Quý
                    </label>
                    <div className="flex gap-[6px]">
                      <button
                        type="button"
                        onClick={() => setCalcStoneMode('catalog')}
                        className={clsx(
                          'py-[3px] px-[8px] rounded-[5px] text-[14px] font-bold cursor-pointer',
                          calcStoneMode === 'catalog'
                            ? 'border border-[#0f172a] bg-[#0f172a] text-surface'
                            : 'border border-[#cbd5e1] bg-surface text-[#334155]'
                        )}
                      >
                        Bảng đá
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcStoneMode('manual')}
                        className={clsx(
                          'py-[3px] px-[8px] rounded-[5px] text-[14px] font-bold cursor-pointer',
                          calcStoneMode === 'manual'
                            ? 'border border-[#0f172a] bg-[#0f172a] text-surface'
                            : 'border border-[#cbd5e1] bg-surface text-[#334155]'
                        )}
                      >
                        Nhập tiền đá
                      </button>
                    </div>
                  </div>

                  {calcStoneMode === 'manual' ? (
                    <div className="grid grid-cols-[1fr_140px] gap-[10px]">
                      <input
                        type="text"
                        value={calcManualStoneName}
                        onChange={(e) => setCalcManualStoneName(e.target.value)}
                        maxLength={200}
                        placeholder="Mô tả đá (VD: Kim cương 4.5 ly)"
                        className="py-[7px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[15.5px]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberVN(calcManualStonePrice)}
                        onChange={(e) => setCalcManualStonePrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="Giá đá (₫)"
                        className="py-[7px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[15.5px] font-bold"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[10px]">
                      {/* Mỗi đá chủ tự ra 1 phương án báo giá riêng, đá tấm bên dưới CHỈ đính kèm
                          cho đúng đá chủ đó (không dùng chung giữa các đá chủ). */}
                      {calcStoneRows.filter((r) => r.stoneType === 'MAIN').map((mainRow) => (
                        <div key={mainRow.id} className="border border-[#e2e8f0] rounded-[8px] p-[10px] bg-[#f8fafc]">
                          <div className="grid grid-cols-[1fr_70px_28px] gap-[8px] items-center">
                            <select
                              value={mainRow.stoneId}
                              onChange={(e) => updateStoneRow(mainRow.id, { stoneId: e.target.value })}
                              className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[15px] bg-surface font-bold"
                            >
                              <option value="">-- Chọn đá chủ --</option>
                              {mainRow.stoneId && !stoneCatalog.some((s) => s.id === mainRow.stoneId) && (
                                <option value={mainRow.stoneId}>{mainRow.stoneName || 'Đá đã ngừng bán'} (ngừng bán)</option>
                              )}
                              {stoneCatalog.filter((s) => s.stoneType === 'MAIN').map((s) => (
                                <option key={s.id} value={s.id}>{formatStoneDisplay(s, _currentRole)}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={mainRow.qty}
                              onChange={(e) => updateStoneRow(mainRow.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              placeholder="SL"
                              className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[15px] text-right font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => removeStoneRow(mainRow.id)}
                              className="bg-transparent border-0 text-[#ef4444] cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Đá tấm riêng của đá chủ này */}
                          <div className="pl-[16px] mt-[8px] flex flex-col gap-[6px] border-l-[2px] border-[#e2e8f0]">
                            {calcStoneRows.filter((r) => r.stoneType === 'SIDE' && r.parentId === mainRow.id).map((sideRow) => (
                              <div key={sideRow.id} className="grid grid-cols-[1fr_70px_28px] gap-[8px] items-center">
                                <select
                                  value={sideRow.stoneId}
                                  onChange={(e) => updateStoneRow(sideRow.id, { stoneId: e.target.value })}
                                  className="py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[14.5px] bg-surface"
                                >
                                  <option value="">-- Chọn đá tấm --</option>
                                  {sideRow.stoneId && !stoneCatalog.some((s) => s.id === sideRow.stoneId) && (
                                    <option value={sideRow.stoneId}>{sideRow.stoneName || 'Đá đã ngừng bán'} (ngừng bán)</option>
                                  )}
                                  {stoneCatalog.filter((s) => s.stoneType === 'SIDE').map((s) => (
                                    <option key={s.id} value={s.id}>{formatStoneDisplay(s, _currentRole)}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  value={sideRow.qty}
                                  onChange={(e) => updateStoneRow(sideRow.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                  placeholder="SL"
                                  className="py-[5px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[14.5px] text-right font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeStoneRow(sideRow.id)}
                                  className="bg-transparent border-0 text-[#ef4444] cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addStoneRow('SIDE', mainRow.id)}
                              className="self-start bg-transparent border border-dashed border-[#cbd5e1] rounded-[6px] py-[3px] px-[8px] text-[13.5px] font-bold text-primary cursor-pointer"
                            >
                              + Thêm đá tấm cho đá chủ này
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addStoneRow('MAIN')}
                        className="self-start bg-transparent border border-dashed border-[#cbd5e1] rounded-[6px] py-[4px] px-[8px] text-[14.5px] font-bold text-primary cursor-pointer"
                      >
                        + Thêm option đá mới
                      </button>

                      {/* Đá tấm chưa gắn đá chủ nào (chưa có đá chủ, hoặc dữ liệu cũ trước khi tách nhóm) */}
                      {calcStoneRows.some((r) => r.stoneType === 'SIDE' && !r.parentId) && (
                        <div>
                          <span className="text-[13px] font-extrabold text-faint uppercase block mb-[6px]">
                            Đá Tấm (chưa gắn đá chủ)
                          </span>
                          <div className="flex flex-col gap-[6px]">
                            {calcStoneRows.filter((r) => r.stoneType === 'SIDE' && !r.parentId).map((sideRow) => (
                              <div key={sideRow.id} className="grid grid-cols-[1fr_70px_28px] gap-[8px] items-center">
                                <select
                                  value={sideRow.stoneId}
                                  onChange={(e) => updateStoneRow(sideRow.id, { stoneId: e.target.value })}
                                  className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[15px] bg-surface"
                                >
                                  <option value="">-- Chọn sản phẩm --</option>
                                  {sideRow.stoneId && !stoneCatalog.some((s) => s.id === sideRow.stoneId) && (
                                    <option value={sideRow.stoneId}>{sideRow.stoneName || 'Đá đã ngừng bán'} (ngừng bán)</option>
                                  )}
                                  {stoneCatalog.filter((s) => s.stoneType === 'SIDE').map((s) => (
                                    <option key={s.id} value={s.id}>{formatStoneDisplay(s, _currentRole)}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  value={sideRow.qty}
                                  onChange={(e) => updateStoneRow(sideRow.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                  placeholder="SL"
                                  className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[15px] text-right font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeStoneRow(sideRow.id)}
                                  className="bg-transparent border-0 text-[#ef4444] cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {calcStoneRows.filter((r) => r.stoneType === 'MAIN').length === 0 && (
                        <button
                          type="button"
                          onClick={() => addStoneRow('SIDE')}
                          className="self-start bg-transparent border border-dashed border-[#cbd5e1] rounded-[6px] py-[4px] px-[8px] text-[14.5px] font-bold text-primary cursor-pointer"
                        >
                          + Thêm đá tấm
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Nút Tính Giá */}
                <div className="flex justify-between items-center">
                  {calcError ? (
                    <span className="text-[#dc2626] text-[15px] font-bold">{calcError}</span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={handleRunCalculate}
                    disabled={calcLoading}
                    className={clsx(
                      'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-[#78350f] border-0 rounded-[8px] py-[10px] px-[20px] text-[16px] font-extrabold cursor-pointer shadow-[0_2px_6px_rgba(245,158,11,0.3)]',
                      calcLoading ? 'opacity-70' : 'opacity-100'
                    )}
                  >
                    {calcLoading ? 'Đang tính...' : 'Tính Giá Ngay'}
                  </button>
                </div>
                  </>
                )}

              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="flex justify-end gap-[10px] border-t border-border pt-[14px] mt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface border border-[#cbd5e1] rounded-[8px] py-[10px] px-[18px] text-[16px] font-bold text-[#475569] cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting || !hasValidPrice}
              title={
                !hasValidPrice
                  ? 'Cần có ít nhất 1 phương án báo giá hợp lệ (> 0đ) để gửi báo giá'
                  : isEditMode
                  ? 'Cập nhật lại giá đã báo cho yêu cầu này'
                  : 'Xác nhận và gửi báo giá này'
              }
              className={clsx(
                'text-surface border-0 rounded-[8px] py-[10px] px-[24px] text-[16.5px] font-extrabold transition-[all_0.2s_ease]',
                !hasValidPrice
                  ? 'bg-[#94a3b8] cursor-not-allowed shadow-none'
                  : 'bg-[#0f172a] cursor-pointer shadow-[0_2px_8px_rgba(15,23,42,0.25)]',
                submitting ? 'opacity-70' : 'opacity-100'
              )}
            >
              {submitting ? 'Đang lưu...' : isEditMode ? 'Cập Nhật Giá' : 'Xác Nhận & Gửi Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

