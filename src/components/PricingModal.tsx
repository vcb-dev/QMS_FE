import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Trash2, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import type { QuoteOption, QuoteOptionMaterial, QuoteOptionStone, QuoteRequest, Role } from '../types';
import {
  fetchMasterData,
  calculatePriceMultiApi,
  calculatePriceBatchApi,
  fetchStones,
  fetchSilverMultipliers,
} from '../services/api';
import type { CalculateBatchResultItem } from '../services/api';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { getPrimaryOption, batchResultToOption } from '../utils/quoteOption';
import type { StoneCatalogItem, StoneRow } from '../types';
import { useMaterialStoneRows } from '../hooks/useMaterialStoneRows';
import { useCompareRows } from '../hooks/useCompareRows';
import { clsx } from 'clsx';
import { modalCloseIconBtnCls, modalBackdropCls, modalCardCls, modalHeaderCls, labelUppercaseCls } from '../styles/classNames';

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
  materials?: { id: string; name: string; baseMetal?: { name: string } | null }[];
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
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string; baseMetal?: { name: string } | null }[]>(initialMaterialsList);
  
  const isSilverMaterialId = (materialId?: string) =>
    !!materialId && dbMaterials.find((m) => m.id === materialId)?.baseMetal?.name === 'Bạc';
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  // VAT lấy theo danh mục sản phẩm của yêu cầu đang báo giá (ProductCategory.vatRate),
  // fallback về PRICING_DEFAULTS nếu danh mục chưa cấu hình
  const defaultVatRate = selectedReq?.category?.vatRate ?? PRICING_DEFAULTS.VAT_PCT;

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
    stoneRows: calcStoneRows,
    setStoneRows: setCalcStoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    stoneName,
  } = useMaterialStoneRows(dbMaterials, stoneCatalog);
  const [calcLaborCost, setCalcLaborCost] = useState<string>(String(PRICING_DEFAULTS.LABOR_COST));
  const [calcVat, setCalcVat] = useState<string>(String(PRICING_DEFAULTS.VAT_PCT));
  const [calcIncludeVat, setCalcIncludeVat] = useState<boolean>(true);
  const [calcSilverMultiplier, setCalcSilverMultiplier] = useState<number>(3);

  // Phương án "loại vàng khác" Order tự thêm để so sánh — KHÔNG còn tự sinh từ BE nữa. Mỗi dòng
  // chọn 1 chất liệu khác + PHẢI nhập khối lượng riêng (tuổi vàng khác nhau khối lượng khác nhau).
  // Tính riêng từng dòng qua /quote-options/calculate, gắn locked=true (chỉ tham khảo, không chọn
  // làm giá chính) cùng groupId với phương án chính.
  const { compareRows, setCompareRows, addCompareRow, updateCompareRow, removeCompareRow } = useCompareRows(dbMaterials);

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

    // Bản nháp chưa có giá (VD: "Yêu cầu ban đầu" tự tạo lúc Sale gửi yêu cầu) không phải 1 phương
    // án báo giá thật — không đưa vào state options, nếu không sẽ lệch số thứ tự "Phương án N" và
    // bị gửi kèm lên BE lúc Xác Nhận, tạo dư 1 row quote_options + quote_option_materials rỗng.
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

    if (primaryOpt?.materials && primaryOpt.materials.length > 0) {
      setCalcMaterialRows(
        primaryOpt.materials.map((m: QuoteOptionMaterial, idx: number) => ({
          id: `m_${idx}_${Date.now()}`,
          materialId: m.materialId || m.id || '',
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
        primaryOpt.stones.map((s: QuoteOptionStone, idx: number) => ({
          id: `stone_${idx}_${Date.now()}`,
          stoneType: (s.stone?.stoneType as 'MAIN' | 'SIDE' | '') || '',
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
  }, [isOpen, selectedReq, dbMaterials, defaultVatRate, setCalcMaterialRows, setCalcStoneRows, setCompareRows]);

  // Đổi chất liệu/khối lượng/đá hoặc tiền công/VAT sau khi đã bấm "Tính Giá Ngay" — chỉ xóa lỗi cũ.
  // Kết quả tính đã được thêm thẳng vào "Các Phương Án Báo Giá" ngay khi tính xong (xem
  // handleRunCalculate), không còn ở trạng thái xem trước nên không cần xóa gì thêm ở đây.
  useEffect(() => {
    setCalcError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcMaterialRows, calcSilverMultiplier, calcStoneRows, calcStoneMode, calcManualStonePrice, calcManualStoneName, calcLaborCost, calcVat, calcIncludeVat]);

  if (!isOpen) return null;

  // Gộp thẳng phương án mới tính được vào "Các Phương Án Báo Giá" (không có bước xem trước/bấm
  // "Thêm" thủ công). Phương án trùng giá với phương án đã có bị bỏ qua (không có ý nghĩa so
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
      stoneSelections?: { stoneId: string; quantity: number }[];
      stoneDesc: string;
      groupId: string;
      locked: boolean;
    },
  ): QuoteOption | null =>
    batchResultToOption({
      optionName: ctx.locked
        ? `${materialName} · ${weightChi} chỉ · Loại vàng khác (tham khảo)`
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
      note: ctx.locked ? 'Loại vàng khác — chỉ tham khảo' : 'Tính từ máy tính giá',
    });

  const handleRunCalculate = async () => {
    const validRows = calcMaterialRows.filter(
      (m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0,
    );
    if (validRows.length === 0) {
      setCalcError('Vui lòng chọn ít nhất 1 chất liệu và nhập trọng lượng hợp lệ');
      return;
    }

    // Dòng "loại vàng khác" đã chọn chất liệu nhưng CHƯA nhập khối lượng — bắt buộc nhập.
    if (compareRows.some((r) => r.materialId && !((parseFloat(r.weightChi) || 0) > 0))) {
      setCalcError('Nhập khối lượng (chỉ) cho phương án loại vàng khác');
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

      const stoneSelections =
        calcStoneMode === 'catalog' && calcStoneRows.length > 0
          ? calcStoneRows.filter((r) => r.stoneId).map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
          : undefined;
      const stoneDesc =
        calcStoneMode === 'manual'
          ? calcManualStoneName
          : calcStoneRows.map((r) => stoneName(r.stoneId)).join(', ');

      // Các dòng "loại vàng khác" hợp lệ (đã chọn chất liệu + nhập khối lượng > 0).
      const compareValid = compareRows.filter(
        (r) => r.materialId && (parseFloat(r.weightChi) || 0) > 0,
      );
      const compareItems = compareValid.map((r) => ({
        materialNameOrKey: r.materialName,
        weightChi: parseFloat(r.weightChi) || 0,
        laborCost: l,
        stoneCost: manualStoneCost || undefined,
        stones: stoneSelections,
        vatRate: vatVal,
        // BE chỉ áp hệ số nhân cho chất liệu dùng công thức MULTIPLIER (Bạc); gửi luôn cũng an toàn.
        silverMultiplier: isSilverMaterialId(r.materialId) ? calcSilverMultiplier : undefined,
      }));

      // Bấm "Tính Giá Ngay" lần 2 (chỉ thêm phương án so sánh, giá chính không đổi) — phương án
      // chính bị addOptionsToList bỏ qua vì trùng giá. Phải gán các phương án so sánh MỚI vào ĐÚNG
      // groupId của phương án chính đang có, nếu không chúng thành "mồ côi" và không hiện lên.
      const resolveGroupId = (primaryPrice: number): string => {
        const existing = options.find(
          (o) =>
            !o.locked &&
            o.quotedPrice != null &&
            Number(o.quotedPrice) === Number(primaryPrice),
        );
        return existing?.groupId || `g_${Date.now()}`;
      };

      const mapCompare = (
        results: CalculateBatchResultItem[],
        gid: string,
        offset: number,
      ): QuoteOption[] =>
        compareValid
          .map((r, i) =>
            mapOption(r.materialName, r.materialId, parseFloat(r.weightChi) || 0, results[i + offset], {
              laborCost: l,
              vatVal,
              stoneSelections,
              stoneDesc,
              groupId: gid,
              locked: true,
            }),
          )
          .filter((o): o is QuoteOption => !!o);

      if (validRows.length === 1) {
        const single = validRows[0];
        const w = parseFloat(single.weightChi) || 0;
        // 1 request duy nhất: phương án chính (index 0) + toàn bộ dòng "loại vàng khác".
        const results = await calculatePriceBatchApi({
          categoryId: selectedReq?.category?.id || undefined,
          includeVat: calcIncludeVat,
          items: [
            {
              materialNameOrKey: single.materialName,
              weightChi: w,
              laborCost: l,
              stoneCost: manualStoneCost || undefined,
              stones: stoneSelections,
              vatRate: vatVal,
              silverMultiplier: isSilverMaterialId(single.materialId || single.id) ? calcSilverMultiplier : undefined,
            },
            ...compareItems,
          ],
        });
        const mainOpt = mapOption(
          single.materialName,
          single.materialId || single.id,
          w,
          results[0],
          { laborCost: l, vatVal, stoneSelections, stoneDesc, groupId: `g_${Date.now()}`, locked: false },
        );
        if (!mainOpt) {
          setCalcError(results[0]?.error || 'Không nhận được giá hợp lệ từ hệ thống');
          return;
        }
        const gid = resolveGroupId(mainOpt.quotedPrice);
        mainOpt.groupId = gid;
        addOptionsToList([mainOpt, ...mapCompare(results, gid, 1)]);
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
          manualStonePrice:
            calcStoneMode === 'manual' && manualStoneCost > 0 ? manualStoneCost : undefined,
        };

        const res = await calculatePriceMultiApi(payload);
        const matSummary = validRows.map((m) => `${m.materialName} (${m.weightChi} chỉ)`).join(' + ');

        const groupId = resolveGroupId(res.quotedPrice);
        const compareOpts =
          compareItems.length > 0
            ? mapCompare(
                await calculatePriceBatchApi({
                  categoryId: selectedReq?.category?.id || undefined,
                  includeVat: calcIncludeVat,
                  items: compareItems,
                }),
                groupId,
                0,
              )
            : [];

        addOptionsToList([
          {
            // matSummary đã gồm tên + khối lượng từng chất liệu, đủ phân biệt các cụm.
            optionName: `Phương án phối hợp (${matSummary})`,
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
            groupId,
            priceBreakdown:
              res.materialPrice != null
                ? { material: res.materialPrice, stone: res.stonePrice ?? 0 }
                : undefined,
            materials: payload.materials,
            stones: payload.stones,
            stoneDescription:
              calcStoneMode === 'manual'
                ? calcManualStoneName
                : calcStoneRows.map((r) => stoneName(r.stoneId)).join(', '),
            note: 'Tính từ máy tính giá',
          },
          ...compareOpts,
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

  const isSilverPresent = calcMaterialRows.some((m) => isSilverMaterialId(m.materialId || m.id));

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
    <div className={modalBackdropCls}>
      <div className={clsx(modalCardCls, '!max-w-[860px] !w-[95%] !max-h-[92vh] overflow-y-auto')}>
        <div className={clsx(modalHeaderCls, '!py-[16px] !px-[20px]')}>
          <div>
            <h2 className="m-0 text-[17px] font-extrabold text-[#0f172a]">
              Báo Giá Yêu Cầu {selectedReq?.code || ''}
            </h2>
            <span className="text-[12px] text-muted">
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
                <h3 className="text-[15px] font-extrabold text-[#0f172a] m-0">
                  Các Phương Án Báo Giá ({primaryEntries.length})
                </h3>
              </div>
              <span className="text-[11.5px] text-muted">
                Chọn 1 phương án làm giá chính để chốt
              </span>
            </div>

            {primaryEntries.length === 0 ? (
              <div className="bg-[#f8fafc] p-[16px] rounded-[10px] text-center text-muted text-[13px]">
                Chưa có phương án nào. Hãy dùng bảng máy tính bên dưới và bấm <strong>"Tính Giá Ngay"</strong> — phương án sẽ tự hiện lên đây.
              </div>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {primaryEntries.map(({ opt, idx }) => {
                  const children = opt.groupId ? lockedByGroup.get(opt.groupId) || [] : [];
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
                            type="radio"
                            name="selectedOptionRadio"
                            checked={!!opt.isSelected}
                            onChange={() => handleSelectOption(idx)}
                            className="w-[16px] h-[16px] accent-[#16a34a] cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-extrabold text-[#0f172a]">
                              {opt.optionName || `Phương án ${idx + 1}`}
                              {opt.isSelected && (
                                <span className="ml-[8px] bg-[#16a34a] text-surface text-[10px] font-extrabold py-[2px] px-[8px] rounded-[20px]">
                                  ĐÃ CHỌN LÀM GIÁ CHÍNH
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-muted mt-[2px]">
                              {opt.materialName ? `Chất liệu: ${opt.materialName}` : ''}
                              {opt.weightChi ? ` · ${opt.weightChi} chỉ` : ''}
                              {opt.vat != null ? ` · VAT ${opt.vat}%` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-[12px] shrink-0">
                        <div className="flex flex-col items-end">
                          <strong className="text-[16px] font-black text-[#16a34a] tabular-nums">
                            {formatCurrency(opt.quotedPrice)}
                          </strong>
                          {renderPriceBreakdownLines(getPriceBreakdown(opt))}
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

                      {/* Phương án đính kèm (khác chất liệu Sale/tuổi vàng khác) — lồng trong card
                          của phương án chính cùng cụm, chỉ để tham khảo, không có radio chọn. */}
                      {children.length > 0 && (
                        <div className="pt-0 pr-[14px] pb-[12px] pl-[40px] flex flex-col gap-[6px]">
                          <span className="text-[10.5px] font-extrabold text-faint uppercase">
                            Phương án đính kèm — chỉ tham khảo
                          </span>
                          {children.map(({ opt: childOpt, idx: childIdx }) => (
                            <div
                              key={childIdx}
                              className="flex items-center justify-between gap-[8px] py-[6px] px-[10px] bg-surface border border-dashed border-[#cbd5e1] rounded-[8px]"
                            >
                              <span className="text-[12px] font-bold text-muted min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                {childOpt.optionName || childOpt.materialName}
                              </span>
                              <div className="flex items-center gap-[8px] shrink-0">
                                <div className="flex flex-col items-end">
                                  <strong className="text-[13px] font-extrabold text-[#16a34a] tabular-nums">
                                    {formatCurrency(childOpt.quotedPrice)}
                                  </strong>
                                  {renderPriceBreakdownLines(getPriceBreakdown(childOpt))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(childIdx)}
                                  title="Xóa phương án đính kèm này"
                                  className="bg-transparent border-0 text-faint cursor-pointer flex items-center"
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
                <h3 className="text-[15px] font-extrabold text-[#0f172a] m-0">
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
                        className="flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[6px] py-[4px] px-[10px] text-[11.5px] font-extrabold text-[#0f172a] cursor-pointer"
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
                          disabled={!!selectedReq}
                          onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                          title={selectedReq ? 'Không thể đổi chất liệu Sale đã yêu cầu' : undefined}
                          className={clsx(
                            'py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold',
                            selectedReq ? 'bg-[#f1f5f9] text-muted cursor-not-allowed' : 'bg-surface cursor-pointer'
                          )}
                        >
                          {dbMaterials.map((mat) => (
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
                            className="w-full pt-[8px] pr-[38px] pb-[8px] pl-[10px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold bg-surface tabular-nums"
                          />
                          <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-bold">
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
                      Phương án loại vàng khác (tham khảo)
                    </label>
                    <button
                      type="button"
                      onClick={addCompareRow}
                      className="flex items-center gap-[4px] bg-surface border border-[#cbd5e1] rounded-[6px] py-[4px] px-[10px] text-[11.5px] font-extrabold text-[#0f172a] cursor-pointer"
                    >
                      <Plus size={13} /> Thêm phương án
                    </button>
                  </div>

                  {compareRows.length === 0 ? (
                    <p className="text-[11.5px] text-faint m-0">
                      Thêm loại vàng khác để báo khách tham khảo — mỗi loại phải nhập khối lượng riêng.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-[8px]">
                      {compareRows.map((row) => (
                        <div
                          key={row.id}
                          className="grid grid-cols-[1fr_140px_32px] gap-[10px] items-center"
                        >
                          <select
                            key={dbMaterials.length}
                            value={row.materialId}
                            onChange={(e) => updateCompareRow(row.id, { materialId: e.target.value })}
                            className="py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold bg-surface cursor-pointer"
                          >
                            {dbMaterials.map((mat) => (
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
                                updateCompareRow(row.id, { weightChi: v });
                              }}
                              placeholder="Số chỉ"
                              className="w-full pt-[8px] pr-[38px] pb-[8px] pl-[10px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold bg-surface tabular-nums"
                            />
                            <span className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[11px] text-muted font-bold">
                              chỉ
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCompareRow(row.id)}
                            className="h-[32px] w-[32px] rounded-[6px] border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Tiền công & VAT */}
                <div className="grid grid-cols-[1fr_140px] gap-[12px]">
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
                      className="w-full py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold bg-surface"
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
                        className="w-[65px] py-[8px] px-[10px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold bg-surface"
                      />
                      <label className="text-[12px] text-[#334155] font-bold flex items-center gap-[4px] cursor-pointer">
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
                      className="py-[4px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[12.5px] font-bold"
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
                          'py-[3px] px-[8px] rounded-[5px] text-[11px] font-bold cursor-pointer',
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
                          'py-[3px] px-[8px] rounded-[5px] text-[11px] font-bold cursor-pointer',
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
                        className="py-[7px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[12.5px]"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatNumberVN(calcManualStonePrice)}
                        onChange={(e) => setCalcManualStonePrice(e.target.value.replace(/\D/g, ''))}
                        placeholder="Giá đá (₫)"
                        className="py-[7px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[12.5px] font-bold"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[6px]">
                      {calcStoneRows.map((sRow) => (
                        <div key={sRow.id} className="grid grid-cols-[90px_1fr_70px_28px] gap-[8px] items-center">
                          <select
                            value={sRow.stoneType}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneType: e.target.value as StoneRow['stoneType'], stoneId: '' })}
                            className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[12px]"
                          >
                            <option value="">Loại đá</option>
                            <option value="MAIN">Đá chủ</option>
                            <option value="SIDE">Đá tấm</option>
                          </select>
                          <select
                            value={sRow.stoneId}
                            disabled={!sRow.stoneType}
                            onChange={(e) => updateStoneRow(sRow.id, { stoneId: e.target.value })}
                            className={clsx(
                              'py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[12px]',
                              sRow.stoneType ? 'bg-surface' : 'bg-[#f1f5f9]'
                            )}
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
                            className="py-[6px] px-[8px] rounded-[6px] border border-[#cbd5e1] text-[12px] text-right font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => removeStoneRow(sRow.id)}
                            className="bg-transparent border-0 text-[#ef4444] cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addStoneRow}
                        className="self-start bg-transparent border border-dashed border-[#cbd5e1] rounded-[6px] py-[4px] px-[8px] text-[11.5px] font-bold text-primary cursor-pointer"
                      >
                        + Thêm loại đá
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Nút Tính Giá */}
                <div className="flex justify-between items-center">
                  {calcError ? (
                    <span className="text-[#dc2626] text-[12px] font-bold">{calcError}</span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={handleRunCalculate}
                    disabled={calcLoading}
                    className={clsx(
                      'bg-[linear-gradient(135deg,#fbbf24,#f59e0b)] text-[#78350f] border-0 rounded-[8px] py-[10px] px-[20px] text-[13px] font-extrabold cursor-pointer shadow-[0_2px_6px_rgba(245,158,11,0.3)]',
                      calcLoading ? 'opacity-70' : 'opacity-100'
                    )}
                  >
                    {calcLoading ? 'Đang tính...' : 'Tính Giá Ngay'}
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="flex justify-end gap-[10px] border-t border-border pt-[14px] mt-[4px]">
            <button
              type="button"
              onClick={onClose}
              className="bg-surface border border-[#cbd5e1] rounded-[8px] py-[10px] px-[18px] text-[13px] font-bold text-[#475569] cursor-pointer"
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
              className={clsx(
                'text-surface border-0 rounded-[8px] py-[10px] px-[24px] text-[13.5px] font-extrabold transition-[all_0.2s_ease]',
                !hasValidPrice
                  ? 'bg-[#94a3b8] cursor-not-allowed shadow-none'
                  : 'bg-[#0f172a] cursor-pointer shadow-[0_2px_8px_rgba(15,23,42,0.25)]',
                submitting ? 'opacity-70' : 'opacity-100'
              )}
            >
              {submitting ? 'Đang lưu...' : 'Xác Nhận & Gửi Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
