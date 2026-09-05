import React, { useEffect, useRef, useState } from 'react';
import { Calculator, CheckCircle2, RotateCcw, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { fetchMasterData, calculatePriceMultiApi, calculatePriceBatchApi, fetchStones, fetchSilverMultipliers } from '../services/api';
import type { CalculateBatchResultItem } from '../services/api';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { formatOptionCopyLine, cleanOptionLabel, batchResultToOption } from '../utils/quoteOption';
import { VnGoldPriceTicker } from '../components/VnGoldPriceTicker';
import type { CalculatorPageProps, StoneRow, StoneCatalogItem, CalcResult, QuoteOption } from '../types';
import { clsx } from 'clsx';
import { cardCls, formGroupCls, formLabelCls } from '../styles/classNames';
import { useMaterialStoneRows } from '../hooks/useMaterialStoneRows';
import { useCompareRows } from '../hooks/useCompareRows';

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  currentRole,
  onApplyToNewRequest,
}) => {
  // Metal Prices hook (giá Vàng/Bạc/Bạch kim luôn đọc trực tiếp từ DB qua BE) — đây là giá GỐC dùng để tính.
  // Sửa giá gốc giờ làm ở trang "Cấu hình giá" (PricingConfigPage), không tùy chỉnh trực tiếp ở đây nữa.
  const { baseMetals } = useMetalPrices();

  // SALE không thấy khối giá tham khảo thị trường
  const isSale = currentRole === 'SALE';

  // Master Data from DB (Materials & Categories)
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string; laborCost?: number | null; vatRate?: number | null }[]>([]);
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string; baseMetal?: { id: string; name: string } | null }[]>([]);
  // Danh mục đá (đá chủ/đá tấm) lấy từ bảng Stone trong DB — khai báo sớm vì useMaterialStoneRows
  // cần đọc stoneCatalog để tra đơn giá/tên đá.
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);

  // Form Input States
  const [categoryId, setCategoryId] = useState('');
  // State + CRUD của materialRows/stoneRows dùng chung với PricingModal qua hook này
  // (xem hooks/useMaterialStoneRows.ts).
  const {
    materialRows,
    setMaterialRows,
    addMaterialRow,
    updateMaterialRow,
    removeMaterialRow,
    stoneRows,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
  } = useMaterialStoneRows(dbMaterials, stoneCatalog, [
    { id: '1', materialId: '', materialName: '', weightChi: PRICING_DEFAULTS.WEIGHT_CHI },
  ]);
  // Tiền công/VAT: ORDER/ADMIN sửa trực tiếp cho báo giá đang tính, không cần bước "Cấu hình" riêng
  // — mặc định nạp từ cấu hình chuẩn (Material.laborCost/PricingConfig.defaultVatRate) rồi cho sửa tự do.
  const [laborCost, setLaborCost] = useState<number>(PRICING_DEFAULTS.LABOR_COST);
  const [vatPct, setVatPct] = useState<number>(PRICING_DEFAULTS.VAT_PCT);
  // Sale chỉ chọn CÓ/KHÔNG cộng VAT, không tự set mức % (mức % luôn theo cấu hình chuẩn ORDER/ADMIN)
  const [includeVat, setIncludeVat] = useState<boolean>(true);

  // Bạc dùng quy tắc riêng (giá vốn × hệ số nhân) — tra qua baseMetal.name của material ĐÃ CHỌN
  // (dbMaterials, từ dropdown thật), không đoán qua regex tên chất liệu nữa.
  const isSilverMaterial = materialRows.some((row) => {
    const mat = dbMaterials.find((dm) => dm.id === row.materialId);
    return mat?.baseMetal?.name === 'Bạc';
  });
  // Hệ số nhân Bạc — danh sách lấy từ cấu hình, người dùng chọn muốn nhân với hệ số nào lúc tính giá
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  const [selectedSilverMultiplier, setSelectedSilverMultiplier] = useState<number>(3);

  // Phương án so sánh loại vàng khác — người dùng TỰ thêm (không tự sinh từ BE). Mỗi dòng chọn
  // 1 chất liệu khác + PHẢI nhập khối lượng riêng (tuổi vàng khác nhau khối lượng khác nhau). Tính
  // riêng từng dòng qua /quote-options/calculate, gắn locked=true (chỉ tham khảo).
  const { compareRows, addCompareRow, updateCompareRow, removeCompareRow } = useCompareRows(dbMaterials);
  // Chặn auto-calc chạy với material/hệ số mặc định (hardcode) trước khi DB trả dữ liệu thật về —
  // nếu không sẽ tính 2 lần: 1 lần với default lúc mount, 1 lần nữa khi master data/silver-multipliers tới
  const [initialDataReady, setInitialDataReady] = useState(false);

  // 2 phương thức nhập giá đá theo mục 3.1: nhập tổng trực tiếp, hoặc tính từ bảng đá (mặc định)
  const [stoneInputMode, setStoneInputMode] = useState<'table' | 'total'>('table');
  const [manualStoneTotal, setManualStoneTotal] = useState<number>(0);

  // Kết quả tính giá — chỉ hiện sau khi bấm "Tính giá ngay" (không tự động gọi API khi gõ)
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  // Chi tiết cấu thành giá (giá kim loại/công/đá/VAT) — chỉ ORDER/ADMIN được xem, SALE chỉ thấy tổng
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDebouncing, setIsDebouncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCalculating = !initialDataReady || loading || isDebouncing;

  // Danh sách các phương án giá (VD: đủ giá 10K/14K/18K/610/24K khi chọn vàng) — để Sale copy nhanh
  const [priceOptions, setPriceOptions] = useState<QuoteOption[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyPrice = (idx: number, opt: QuoteOption) => {
    const text = formatOptionCopyLine(opt);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAllPrices = () => {
    const text = priceOptions.map((opt) => formatOptionCopyLine(opt)).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchStones()
      .then((rows: StoneCatalogItem[]) => setStoneCatalog(Array.isArray(rows) ? rows : []))
      .catch((err) => console.error('Lỗi tải danh mục đá:', err));
  }, []);

  // Load Categories & Materials & hệ số nhân Bạc từ DB cùng lúc
  useEffect(() => {
    Promise.allSettled([fetchMasterData(), fetchSilverMultipliers()]).then(([masterResult, silverResult]) => {
      if (masterResult.status === 'fulfilled') {
        const master = masterResult.value;
        if (master?.categories && master.categories.length > 0) {
          setDbCategories(master.categories);
          setCategoryId(master.categories[0].id);
        }
        if (master?.materials && master.materials.length > 0) {
          setDbMaterials(master.materials);
          setMaterialRows((prev) => [
            {
              id: '1',
              materialId: master.materials[0].id,
              materialName: master.materials[0].name,
              weightChi: prev[0]?.weightChi || PRICING_DEFAULTS.WEIGHT_CHI,
            },
          ]);
        }
      } else {
        console.error('Lỗi tải master data từ DB:', masterResult.reason);
      }

      if (silverResult.status === 'fulfilled') {
        const list = silverResult.value;
        setSilverMultipliers(list);
        if (list.length > 0) setSelectedSilverMultiplier(list[0]);
      } else {
        console.error('Lỗi tải hệ số nhân Bạc:', silverResult.reason);
      }

      setInitialDataReady(true);
    });
  }, [setMaterialRows]);

  // VAT & tiền công chuẩn nạp theo danh mục sản phẩm đang chọn (ProductCategory.vatRate/laborCost).
  // Đổi danh mục thì đổi luôn VAT/công gợi ý, và vì cả 2
  // đều nằm trong dependencies của effect tính giá debounce bên dưới nên đổi danh mục sẽ tự tính
  // lại giá luôn.
  useEffect(() => {
    if (!categoryId) return;
    const cat = dbCategories.find((c) => c.id === categoryId);
    if (cat?.vatRate != null) setVatPct(Number(cat.vatRate));
    if (cat?.laborCost != null) setLaborCost(Number(cat.laborCost));
  }, [categoryId, dbCategories]);

  // Đá chọn từ danh mục → gửi danh sách {stoneId, quantity} cho BE tự cộng tổng tiền đá.
  // Đá nhập tổng tay → gửi thẳng số user gõ. FE KHÔNG tự cộng đơn giá × số lượng nữa.
  const catalogStoneSelections =
    stoneInputMode === 'table'
      ? stoneRows.filter((r) => r.stoneId).map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
      : [];
  const manualStoneCost = stoneInputMode === 'total' ? manualStoneTotal || 0 : 0;

  // requestId chặn race: nếu gõ tiếp trong lúc request cũ chưa về, kết quả cũ về sau bị bỏ qua
  const calcRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref lưu categoryId mới nhất để runCalculate() luôn đọc đúng danh mục hiện tại kể cả khi được
  // gọi từ closure cũ (vd nút "Tính lại giá" bấm ngay sau khi đổi danh mục, trước khi effect debounce kịp chạy).
  const categoryIdRef = useRef(categoryId);
  useEffect(() => {
    categoryIdRef.current = categoryId;
  }, [categoryId]);

  // 1 item gửi lên /quote-options/calculate-batch cho 1 dòng compareRows.
  const compareBatchItem = (r: { materialId: string; materialName: string; weightChi: string }) => {
    const cMat = dbMaterials.find((dm) => dm.id === r.materialId);
    const cSilver = cMat?.baseMetal?.name === 'Bạc';
    return {
      materialNameOrKey: r.materialName,
      weightChi: parseFloat(r.weightChi) || 0,
      laborCost: laborCost || 0,
      stoneCost: manualStoneCost || undefined,
      stones: catalogStoneSelections.length > 0 ? catalogStoneSelections : undefined,
      vatRate: vatPct || 0,
      silverMultiplier: cSilver ? selectedSilverMultiplier : undefined,
    };
  };

  // Map 1 kết quả batch thành phương án "loại vàng khác" (locked) — dùng chung
  // batchResultToOption (utils/quoteOption).
  const mapCompareOpt = (
    r: { materialId: string; materialName: string; weightChi: string },
    cr: CalculateBatchResultItem | undefined,
    vatValNum: number,
    sharedStones: { stoneId: string; quantity: number }[] | undefined,
  ): QuoteOption | null => {
    const cw = parseFloat(r.weightChi) || 0;
    return batchResultToOption({
      optionName: `${r.materialName} · ${cw} chỉ · Loại vàng khác (tham khảo)`,
      materialName: r.materialName,
      materialId: r.materialId || undefined,
      weightChi: cw,
      res: cr,
      vat: vatValNum,
      locked: true,
      stones: sharedStones,
    });
  };

  // Các phương án "loại vàng khác" (compareRows) — bỏ qua dòng chưa nhập khối lượng, tính TẤT CẢ
  // trong 1 request /quote-options/calculate-batch.
  const buildCompareOptions = async (
    vatValNum: number,
    sharedStones: { stoneId: string; quantity: number }[] | undefined,
    currentCatId: string | undefined,
  ): Promise<QuoteOption[]> => {
    const rows = compareRows.filter(
      (r) => r.materialId && (parseFloat(r.weightChi) || 0) > 0,
    );
    if (rows.length === 0) return [];
    const results = await calculatePriceBatchApi({
      categoryId: currentCatId || undefined,
      includeVat,
      items: rows.map(compareBatchItem),
    });
    return rows
      .map((r, i) => mapCompareOpt(r, results[i], vatValNum, sharedStones))
      .filter((o): o is QuoteOption => !!o);
  };

  const runCalculate = async () => {
    const validRows = materialRows.filter((m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0);
    if (validRows.length === 0) {
      setQuotedPrice(null);
      setCalcResult(null);
      setPriceOptions([]);
      setErrorMessage(null);
      return;
    }

    const currentCatId = categoryIdRef.current || categoryId;
    const requestId = ++calcRequestIdRef.current;
    setLoading(true);
    setIsDebouncing(false);
    setErrorMessage(null);
    try {
      if (validRows.length === 1) {
        // Luồng 1 chất liệu: tính giá chính qua /calculate. KHÔNG còn tự sinh bảng so sánh tuổi
        // vàng — các phương án "loại vàng khác" do người dùng tự thêm ở khối compareRows.
        const singleRow = validRows[0];
        const w = parseFloat(singleRow.weightChi) || 0;
        const singleMat = dbMaterials.find((dm) => dm.id === singleRow.materialId);
        const isSingleSilver = singleMat?.baseMetal?.name === 'Bạc';

        const sharedStones =
          catalogStoneSelections.length > 0 ? catalogStoneSelections : undefined;
        const vatValNum = includeVat ? (vatPct || 10) : 0;

        // 1 request duy nhất: phương án chính (index 0) + tất cả dòng "loại vàng khác".
        const compareValid = compareRows.filter(
          (r) => r.materialId && (parseFloat(r.weightChi) || 0) > 0,
        );
        const batch = await calculatePriceBatchApi({
          categoryId: currentCatId || undefined,
          includeVat,
          items: [
            {
              materialNameOrKey: singleRow.materialName,
              weightChi: w,
              laborCost: laborCost || 0,
              stoneCost: manualStoneCost || undefined,
              stones: sharedStones,
              vatRate: vatPct || 0,
              silverMultiplier: isSingleSilver ? selectedSilverMultiplier : undefined,
            },
            ...compareValid.map(compareBatchItem),
          ],
        });

        if (requestId !== calcRequestIdRef.current) return; // đã có input mới hơn, bỏ kết quả cũ này

        const res = batch[0];
        if (res && !res.error && typeof res.quotedPrice === 'number' && Number.isFinite(res.quotedPrice)) {
          setQuotedPrice(res.quotedPrice);
          // BE chỉ trả đủ cấu thành giá cho ORDER/ADMIN — Sale nhận bản rút gọn (chỉ quotedPrice).
          // Khối JSX đọc field đầy đủ đã tự khóa sau guard currentRole nên an toàn ở runtime.
          setCalcResult({
            totalMetalCost: res.totalMetalCost ?? 0,
            metalRawCost: res.metalRawCost,
            laborCost: res.laborCost ?? 0,
            stoneCost: res.stoneCost ?? 0,
            stonePrice: res.stonePrice ?? 0,
            materialPrice: res.materialPrice,
            vatRate: vatPct || 10,
            vatAmount: res.vatAmount ?? 0,
            metalVatAmount: res.metalVatAmount,
            metalProfit: res.metalProfit,
            stoneVatAmount: res.stoneVatAmount,
            stoneProfit: res.stoneProfit,
            quotedPrice: res.quotedPrice,
            profitMarginLabel: res.profitMarginLabel,
          });
        } else {
          setQuotedPrice(null);
          setCalcResult(null);
          setErrorMessage(res?.error || 'Không nhận được giá hợp lệ từ hệ thống');
        }

        const mainOption = batchResultToOption({
          optionName: singleRow.materialName,
          materialName: singleRow.materialName,
          materialId: singleRow.materialId || undefined,
          weightChi: w,
          res,
          vat: vatValNum,
          locked: false,
          stones: sharedStones,
        });

        const compareOptions = compareValid
          .map((r, i) => mapCompareOpt(r, batch[i + 1], vatValNum, sharedStones))
          .filter((o): o is QuoteOption => !!o);

        setPriceOptions(
          mainOption ? [{ ...mainOption, isSelected: true }, ...compareOptions] : compareOptions,
        );
      } else {
        // Luồng NHIỀU chất liệu: Gọi API calculate-multi
        const multiPayload = {
          materials: validRows.map((m) => ({
            materialId: m.materialId || m.id,
            materialName: m.materialName,
            weightChi: parseFloat(m.weightChi) || 0,
          })),
          categoryId: currentCatId || undefined,
          laborCost: laborCost || 0,
          vatRate: vatPct || 0,
          includeVat,
          stones: catalogStoneSelections.length > 0 ? catalogStoneSelections : undefined,
          manualStoneName: manualStoneCost > 0 ? 'Đá tổng' : undefined,
          manualStonePrice: manualStoneCost > 0 ? manualStoneCost : undefined,
        };

        const res = await calculatePriceMultiApi(multiPayload);
        const vatValNum = includeVat ? (vatPct || 10) : 0;
        const compareOptions = await buildCompareOptions(
          vatValNum,
          multiPayload.stones,
          currentCatId,
        );

        if (requestId !== calcRequestIdRef.current) return;

        if (res && typeof res.quotedPrice === 'number' && Number.isFinite(res.quotedPrice)) {
          setQuotedPrice(res.quotedPrice);
          setCalcResult({
            totalMetalCost: res.totalMetalCost,
            metalRawCost: res.metalRawCost,
            laborCost: res.laborCost,
            stoneCost: res.stoneCost,
            stonePrice: res.stonePrice || 0,
            materialPrice: res.materialPrice,
            vatRate: vatPct || 10,
            vatAmount: res.vatAmount,
            metalVatAmount: res.metalVatAmount,
            metalProfit: res.metalProfit,
            stoneVatAmount: res.stoneVatAmount,
            stoneProfit: res.stoneProfit,
            quotedPrice: res.quotedPrice,
            breakdown: res.breakdown,
          });

          // Option tóm tắt cho nhiều chất liệu — phải mang đủ field cấu thành giá (totalMetalCost/
          // laborCost/stoneCost/vat...) để trang Chi Tiết Yêu Cầu tách hiển thị được như lúc tính,
          // và materials/stones structured để BE lưu đúng QuoteOptionMaterial/QuoteOptionStone.
          const matSummary = validRows.map((m) => `${m.materialName} (${m.weightChi} chỉ)`).join(' + ');
          setPriceOptions([
            {
              optionName: `Phương án phối hợp (${matSummary})`,
              materialName: matSummary,
              weightChi: validRows.reduce((sum, m) => sum + (parseFloat(m.weightChi) || 0), 0),
              laborCost: res.laborCost,
              stoneCost: res.stoneCost,
              totalMetalCost: res.totalMetalCost,
              metalRawCost: res.metalRawCost,
              stonePrice: res.stonePrice || 0,
              vat: includeVat ? (vatPct || 10) : 0,
              quotedPrice: res.quotedPrice,
              isSelected: true,
              materials: validRows.map((m) => ({ materialId: m.materialId || m.id, weightChi: parseFloat(m.weightChi) || 0 })),
              stones: multiPayload.stones,
            },
            ...compareOptions,
          ]);
        } else {
          setQuotedPrice(null);
          setCalcResult(null);
          setErrorMessage('Không nhận được giá hợp lệ từ hệ thống');
        }
      }
    } catch (err: any) {
      if (requestId !== calcRequestIdRef.current) return;
      console.error('Lỗi tính giá BE:', err);
      setErrorMessage(err.message || 'Không thể tính giá từ hệ thống');
    } finally {
      if (requestId === calcRequestIdRef.current) {
        setLoading(false);
        setIsDebouncing(false);
      }
    }
  };

  // Kết quả tính giá real-time khi nhập liệu — debounce 500ms sau lần gõ cuối để khỏi spam API.
  // categoryId NẰM trong dependencies — mỗi danh mục có tiền công/VAT chuẩn riêng (và backend còn
  // dùng categoryId để chọn công thức tính giá), nên đổi danh mục PHẢI tính lại giá. Trước đây cố
  // tình loại categoryId ra để "đổi danh mục không tự gọi API", nhưng laborCost lúc đó cũng không
  // đồng bộ theo danh mục nên đổi danh mục im re không đổi giá — đúng là bug, không phải chủ đích.
  useEffect(() => {
    if (!initialDataReady) return;
    setIsDebouncing(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runCalculate();
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // `baseMetals` KHÔNG nằm trong deps: giá do BE tính từ dữ liệu của BE, mảng baseMetals phía FE
    // chỉ để hiện thanh giá tham khảo. Nó fetch riêng nên hay về sau `initialDataReady` -> nếu để
    // trong deps sẽ kích auto-calc chạy lần 2 cho ra ĐÚNG kết quả cũ (call thừa). Đổi giá gốc trong
    // lúc trang đang mở thì bấm "Tính lại giá".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataReady, categoryId, materialRows, laborCost, vatPct, includeVat, selectedSilverMultiplier, stoneRows, stoneInputMode, manualStoneTotal, compareRows]);

  // Nút "Tính giá ngay" / "Tính lại giá" — bấm để tính ngay, khỏi chờ debounce
  const handleCalculate = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsDebouncing(false);
    runCalculate();
  };

  return (
    <div className="flex flex-col gap-[18px] pb-[30px]">
      <div>
        <h1 className="text-[24px] font-black text-[#0f172a] m-0 tracking-[-0.3px] flex items-center gap-[10px]">
          <Calculator size={22} /> Máy Tính Giá
        </h1>
        <p className="text-[13px] text-muted mt-[4px] mr-0 mb-0 ml-0">
          Tính giá kim hoàn theo thông số sản phẩm, kim loại và đá
        </p>
      </div>

      {/* Giá vàng thị trường theo tuổi — đặt lên đầu trang, ẩn với SALE */}
      {!isSale && <VnGoldPriceTicker />}

      {/* Layout chính: trái nhập liệu, phải bảng báo giá sống (sticky) */}
      <div className="grid [grid-template-columns:1.6fr_1fr] gap-[20px] items-start max-[960px]:!grid-cols-1">
        {/* Cột trái: nhập liệu */}
        <div className="flex flex-col gap-[16px]">

          {/* Section 1: Thông số Sản phẩm & Kim loại */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-[16px] flex-wrap gap-[10px]">
              <h3 className="text-[15px] font-extrabold text-[#0f172a] m-0">Thông số Sản phẩm & Kim loại</h3>
              <button
                type="button"
                onClick={addMaterialRow}
                className="flex items-center gap-[6px] bg-[#f8fafc] border border-[#cbd5e1] rounded-[8px] text-[#334155] text-[12px] font-extrabold py-[7px] px-[14px] cursor-pointer transition-[all_0.15s_ease]"
              >
                <Plus size={14} color="#475569" /> Thêm chất liệu
              </button>
            </div>

            {/* Danh mục sản phẩm */}
            <div className={clsx(formGroupCls, 'mb-[16px]')}>
              <label className={clsx(formLabelCls, 'text-[11px] font-extrabold text-[#64748b] uppercase block mb-[6px]')}>
                DANH MỤC SẢN PHẨM
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full py-[10px] px-[14px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none bg-surface"
              >
                <option value="">-- Chọn danh mục sản phẩm --</option>
                {dbCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Khung danh sách Chất liệu chế tác */}
            <div className="border border-[#e2e8f0] rounded-[12px] p-[14px] bg-[#f8fafc]">
              {/* Header cột cố định */}
              <div
                className="grid [grid-template-columns:1fr_140px_36px] gap-[12px] mb-[8px] py-0 px-[2px]"
              >
                <span className="text-[11px] font-extrabold text-[#64748b] uppercase">
                  LOẠI VÀNG / CHẤT LIỆU
                </span>
                <span className="text-[11px] font-extrabold text-[#64748b] uppercase">
                  TRỌNG LƯỢNG (CHỈ)
                </span>
                <span />
              </div>

              {/* Danh sách các dòng chất liệu */}
              <div className="flex flex-col gap-[8px]">
                {materialRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid [grid-template-columns:1fr_140px_36px] gap-[12px] items-center"
                  >
                    <select
                      value={row.materialId || ''}
                      onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                      className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none bg-surface"
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
                        className="w-full pt-[9px] pr-[42px] pb-[9px] pl-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none bg-surface [font-variant-numeric:tabular-nums]"
                      />
                      <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b]">
                        chỉ
                      </span>
                    </div>

                    {materialRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(row.id)}
                        title="Xóa chất liệu này"
                        className="h-[36px] w-[36px] rounded-[8px] border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] flex items-center justify-center cursor-pointer transition-[all_0.15s_ease]"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div className="w-[36px] h-[36px]" />
                    )}
                  </div>
                ))}
              </div>

              {/* Tổng khối lượng khi có từ 2 chất liệu trở lên */}
              {materialRows.length > 1 && (
                <div className="flex justify-between items-baseline pt-[10px] mt-[10px] border-t border-dashed border-[#cbd5e1] text-[12px] text-[#475569]">
                  <span className="font-bold">Tổng khối lượng:</span>
                  <strong className="text-[13px] text-[#0f172a] [font-variant-numeric:tabular-nums]">
                    {materialRows.reduce((sum, r) => sum + (parseFloat(r.weightChi) || 0), 0).toFixed(2)} chỉ
                  </strong>
                </div>
              )}
            </div>

            {/* Phương án so sánh loại vàng khác — TỰ thêm, không còn tự sinh từ BE. Mỗi loại vàng
                PHẢI nhập khối lượng riêng; kết quả là phương án "chỉ tham khảo". */}
            <div className="border border-[#e2e8f0] rounded-[12px] p-[14px] bg-[#f8fafc] mt-[14px]">
              <div className="flex items-center justify-between mb-[10px]">
                <span className="text-[11px] font-extrabold text-[#64748b] uppercase">
                  Phương án so sánh loại vàng khác (tham khảo)
                </span>
                <button
                  type="button"
                  onClick={addCompareRow}
                  className="flex items-center gap-[6px] bg-surface border border-[#cbd5e1] rounded-[8px] text-[#334155] text-[12px] font-extrabold py-[6px] px-[12px] cursor-pointer"
                >
                  <Plus size={14} color="#475569" /> Thêm phương án
                </button>
              </div>

              {compareRows.length === 0 ? (
                <p className="text-[11.5px] text-[#94a3b8] m-0">
                  Thêm loại vàng khác để báo khách tham khảo — mỗi loại phải nhập khối lượng riêng.
                </p>
              ) : (
                <div className="flex flex-col gap-[8px]">
                  {compareRows.map((row) => {
                    const missingWeight = !((parseFloat(row.weightChi) || 0) > 0);
                    return (
                      <div key={row.id} className="grid [grid-template-columns:1fr_140px_36px] gap-[12px] items-center">
                        <select
                          value={row.materialId || ''}
                          onChange={(e) => updateCompareRow(row.id, { materialId: e.target.value })}
                          className="w-full py-[9px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none bg-surface"
                        >
                          {dbMaterials.map((mat) => (
                            <option key={mat.id} value={mat.id}>{mat.name}</option>
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
                            className={clsx('w-full pt-[9px] pr-[42px] pb-[9px] pl-[12px] rounded-[8px] text-[13px] font-bold outline-none bg-surface [font-variant-numeric:tabular-nums]', missingWeight ? 'border border-[#f87171]' : 'border border-[#cbd5e1]')}
                          />
                          <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#64748b]">
                            chỉ
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCompareRow(row.id)}
                          title="Xóa phương án so sánh này"
                          className="h-[36px] w-[36px] rounded-[8px] border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  <span className="text-[11px] text-[#94a3b8]">
                    Dòng chưa nhập khối lượng sẽ bị bỏ qua khi tính.
                  </span>
                </div>
              )}
            </div>

            {/* Sale: chỉ chọn CÓ/KHÔNG cộng VAT, không thấy/nhập được mức % (mức % do ORDER/ADMIN cấu hình) */}
            {isSale && (
              <label className="flex items-center gap-[8px] mt-[14px] pt-[14px] border-t border-dashed border-[#e2e8f0] cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="w-[16px] h-[16px] cursor-pointer"
                />
                <span className="text-[13px] font-bold text-[#374151]">Cộng VAT vào báo giá</span>
              </label>
            )}

            {/* Hệ số nhân Bạc — chỉ ORDER/ADMIN được chọn, Sale luôn dùng mặc định (server ép, FE ẩn cho khỏi rối) */}
            {isSilverMaterial && !isSale && (
              <div className="mt-[14px] pt-[14px] border-t border-dashed border-[#e2e8f0] flex items-center gap-[10px]">
                <label className="text-[11px] font-extrabold text-[#64748b] uppercase">Hệ số nhân Bạc</label>
                <select
                  value={selectedSilverMultiplier}
                  onChange={(e) => setSelectedSilverMultiplier(parseFloat(e.target.value) || 0)}
                  className="py-[8px] px-[12px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none bg-surface"
                >
                  {silverMultipliers.map((m) => (
                    <option key={m} value={m}>× {m}</option>
                  ))}
                  {silverMultipliers.length === 0 && <option value={3}>× 3</option>}
                </select>
              </div>
            )}

            {/* Thanh giá nhanh — GIÁ GỐC dùng để tính giá. Sale không xem giá vàng/bạc/bạch kim gốc, chỉ nhập rồi bấm Tính giá.
                Sửa giá gốc làm ở trang "Cấu hình giá" (PricingConfigPage), không tùy chỉnh trực tiếp ở đây nữa. */}
            {!isSale && (
              <div className="mt-[14px] pt-[14px] border-t border-dashed border-[#e2e8f0] flex items-center gap-[28px] flex-wrap">
                {baseMetals.map((m, idx) => (
                  <React.Fragment key={m.id}>
                    {idx > 0 && <div className="w-[1px] h-[24px] bg-[#e2e8f0]" />}
                    <div className="flex items-baseline gap-[10px] flex-wrap">
                      <span className="text-[14px] font-extrabold text-[#475569] uppercase tracking-[0.3px]">
                        GIÁ {m.name.toUpperCase()}
                      </span>
                      <strong className="text-[19px] font-black text-[#334155] tracking-[0.3px] [font-variant-numeric:tabular-nums]">
                        {formatNumberVN(m.priceVnd)} <span className="text-[14px] font-bold">đ/chỉ</span>
                      </strong>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 + 3: Đá quý & Chế tác — gộp lưới 2 cột con để giảm chiều cao trang. Bạc dùng chung công/đá, chỉ ẩn riêng ô VAT (Bạc không tính VAT). */}
          {(
            <div className={clsx('grid grid-cols-2 gap-[18px] max-[960px]:!grid-cols-1', isSale && '![grid-template-columns:1fr]')}>
              {/* Section 2: Thông số Đá quý — 2 phương thức nhập theo mục 3.1: nhập tổng trực tiếp, hoặc bảng tính từng viên */}
              <div className={cardCls}>
                <div className="flex items-center justify-between mb-[14px]">
                  <h3 className="text-[15px] font-extrabold text-[#0f172a] m-0">Thông số Đá quý</h3>
                  {stoneInputMode === 'table' && (
                    <button
                      type="button"
                      onClick={addStoneRow}
                      className="bg-[#f3f3f3] border border-[#a3a3a3] text-[#000000] text-[12px] font-extrabold rounded-[6px] py-[6px] px-[14px] cursor-pointer"
                    >
                      + THÊM ĐÁ
                    </button>
                  )}
                </div>

                {/* Chọn phương thức nhập */}
                <div className="flex gap-[8px] mb-[14px]">
                  <button
                    type="button"
                    onClick={() => setStoneInputMode('table')}
                    className={clsx('flex-1 py-[8px] px-[10px] rounded-[8px] text-[12px] font-extrabold cursor-pointer', stoneInputMode === 'table' ? 'border-[1.5px] border-[#0f172a] bg-[#fff7ed] text-[#c2410c]' : 'border border-[#cbd5e1] bg-surface text-muted')}
                  >
                    Tính từ bảng đá
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoneInputMode('total')}
                    className={clsx('flex-1 py-[8px] px-[10px] rounded-[8px] text-[12px] font-extrabold cursor-pointer', stoneInputMode === 'total' ? 'border-[1.5px] border-[#0f172a] bg-[#fff7ed] text-[#c2410c]' : 'border border-[#cbd5e1] bg-surface text-muted')}
                  >
                    Nhập tổng tiền đá
                  </button>
                </div>

                {stoneInputMode === 'total' ? (
                  /* Nhập tổng tiền đá trực tiếp — đã biết giá, khỏi khai từng viên */
                  <div className={formGroupCls}>
                    <label className={clsx(formLabelCls, 'text-[11px] font-extrabold text-[#64748b] uppercase')}>
                      TỔNG TIỀN ĐÁ (VNĐ)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberVN(manualStoneTotal)}
                      onChange={(e) => setManualStoneTotal(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-full py-[10px] px-[14px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none [font-variant-numeric:tabular-nums]"
                    />
                  </div>
                ) : stoneRows.length > 0 ? (
                  <div className="flex flex-col gap-[12px]">
                    {stoneRows.map((row) => (
                      <div
                        key={row.id}
                        className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[12px] p-[14px] relative"
                      >
                        <div className="flex items-center justify-end mb-[6px]">
                          <button
                            type="button"
                            onClick={() => removeStoneRow(row.id)}
                            className="bg-transparent border-0 text-[#ef4444] cursor-pointer text-[16px] font-extrabold"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex flex-col gap-[12px]">
                          <div className="grid grid-cols-2 gap-[10px]">
                            <div>
                              <label className="text-[10.5px] text-[#64748b] font-bold block mb-[4px]">
                                Loại đá
                              </label>
                              <select
                                value={row.stoneType}
                                onChange={(e) => updateStoneRow(row.id, { stoneType: e.target.value as StoneRow['stoneType'], stoneId: '' })}
                                className="w-full py-[8px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[12.5px] font-semibold bg-surface"
                              >
                                <option value="">-- Chọn loại --</option>
                                <option value="MAIN">Đá chủ</option>
                                <option value="SIDE">Đá tấm</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10.5px] text-[#64748b] font-bold block mb-[4px]">
                                Sản phẩm đá
                              </label>
                              <select
                                value={row.stoneId}
                                disabled={!row.stoneType}
                                onChange={(e) => updateStoneRow(row.id, { stoneId: e.target.value })}
                                className={clsx('w-full py-[8px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[12.5px] font-semibold', row.stoneType ? 'bg-surface' : 'bg-[#f1f5f9]')}
                              >
                                <option value="">-- Chọn sản phẩm --</option>
                                {stoneCatalog.filter((s) => s.stoneType === row.stoneType).map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}{s.size ? ` (${s.size})` : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10.5px] text-[#64748b] font-bold block mb-[4px]">
                              SL viên
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={(e) => updateStoneRow(row.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-full py-[8px] px-[10px] rounded-[6px] border border-[#cbd5e1] text-[12.5px] font-bold bg-surface text-right"
                            />
                          </div>

                          {/* Tổng tiền đá do BE tính (đơn giá catalog × SL) — xem "Tổng tiền đá" bên dưới. */}
                        </div>
                      </div>
                    ))}

                    {/* Tổng cộng tất cả các loại đá = Tổng tiền đá (mục 3.2) */}
                    <div className="flex justify-between items-baseline pt-[10px] pr-[4px] pb-0 pl-[4px]">
                      <span className="text-[12px] font-extrabold text-[#374151]">Tổng tiền đá</span>
                      <strong className="text-[15px] text-[#c2410c] [font-variant-numeric:tabular-nums]">
                        {calcResult?.stoneCost != null ? formatCurrency(calcResult.stoneCost) : '—'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="w-full p-[24px] rounded-[12px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center text-[#64748b] text-[13px]">
                    Bấm <strong>"THÊM ĐÁ"</strong> ở trên để nhập danh sách đá quý
                  </div>
                )}
              </div>

              {/* Section 3: Chế tác & Phí dịch vụ — tiền công/VAT sửa trực tiếp cho báo giá đang tính,
                  không ghi đè cấu hình chuẩn (Material.laborCost/PricingConfig.defaultVatRate) */}
              {!isSale && (
                <div className={cardCls}>
                  <h3 className="text-[15px] font-extrabold text-[#0f172a] mt-0 mr-0 mb-[16px] ml-0">Chế tác & Phí dịch vụ</h3>

                  <div className="flex flex-col gap-[16px]">
                    <div className={formGroupCls}>
                      <label className={clsx(formLabelCls, 'text-[11px] font-extrabold text-[#64748b] uppercase')}>
                        TIỀN CÔNG CHẾ TÁC (VNĐ)
                      </label>
                      <input
                        type="text"
                        value={formatNumberVN(laborCost)}
                        onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value.replace(/\D/g, '')) || 0))}
                        className="w-full py-[10px] px-[14px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none [font-variant-numeric:tabular-nums]"
                      />
                    </div>

                    <div className={formGroupCls}>
                      <label className={clsx(formLabelCls, 'text-[11px] font-extrabold text-[#64748b] uppercase')}>
                        THUẾ VAT (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={vatPct}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v !== '' && parseFloat(v) < 0) return;
                          setVatPct(Math.max(0, Math.min(100, parseFloat(v) || 0)));
                        }}
                        className="w-full py-[10px] px-[14px] rounded-[8px] border border-[#cbd5e1] text-[13px] font-bold outline-none [font-variant-numeric:tabular-nums]"
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Các Phương Án Giá — Sale copy nhanh gửi khách (cập nhật sống cùng lúc với bảng bên phải) */}
          {priceOptions.length > 0 && (
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-[16px]">
                <h3 className="text-[15px] font-extrabold text-[#0f172a] m-0">Các Phương Án Giá</h3>
                <button
                  type="button"
                  onClick={handleCopyAllPrices}
                  className={clsx('flex items-center gap-[6px] py-[7px] px-[14px] rounded-[8px] border border-[#cbd5e1] text-[12px] font-bold cursor-pointer', copiedAll ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-surface text-[#475569]')}
                >
                  {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                  {copiedAll ? 'Đã copy hết!' : 'Copy hết'}
                </button>
              </div>
              <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-[12px]">
                {priceOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className={clsx('rounded-[12px] p-[14px] flex items-center justify-between gap-[10px]', opt.isSelected ? 'bg-[#f1f5f9] border-[1.5px] border-[#0f172a]' : 'bg-[#f8fafc] border border-[#e2e8f0]')}
                  >
                    <div className="min-w-0">
                      <div className="text-[11.5px] font-bold text-[#64748b] overflow-hidden text-ellipsis whitespace-nowrap">
                        {cleanOptionLabel(opt)}
                      </div>
                      <div className="flex flex-col">
                        <div className="text-[16px] font-black text-[#0f172a] mt-[2px] [font-variant-numeric:tabular-nums]">
                          {formatCurrency(opt.quotedPrice)}
                        </div>
                        {renderPriceBreakdownLines(getPriceBreakdown(opt))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(idx, opt)}
                      title="Copy giá"
                      className={clsx('shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-[8px] border border-[#cbd5e1] cursor-pointer', copiedIdx === idx ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-surface text-[#475569]')}
                    >
                      {copiedIdx === idx ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: Bảng báo giá sống (sticky) */}
        <div
          className="bg-[#F3F4F6] text-[#111827] border border-[#d1d5db] rounded-[24px] p-[26px] shadow-[0_12px_32px_rgba(15,23,42,0.14)] flex flex-col gap-[16px] sticky top-[20px]"
        >
          {quotedPrice === null ? (
            <>
              {/* Trạng thái chưa tính — chỉ hiện số sau khi bấm nút, header gọn nằm ngang */}
              <div className="flex items-center gap-[10px]">
                <div
                  className="w-[40px] h-[40px] rounded-full bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0"
                >
                  <Calculator size={20} color="#475569" />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-[#111827] m-0">
                    Sẵn sàng tính giá
                  </h2>
                  <p className="text-[11.5px] text-[#6b7280] mt-[2px] mr-0 mb-0 ml-0">
                    Nhập trọng lượng — giá tự động cập nhật, hoặc bấm tính ngay
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={isCalculating}
                className={clsx('w-full border border-[#cbd5e1] rounded-[12px] p-[16px] text-[15px] font-extrabold shadow-none transition-[all_0.2s_ease]', isCalculating ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed opacity-70' : 'bg-[#f1f5f9] text-[#334155] cursor-pointer opacity-100')}
              >
                {isCalculating ? 'Đang tính giá...' : 'Tính giá ngay'}
              </button>
            </>
          ) : (
            <>
              {/* Calculated Result View — đã chốt, header gọn nằm ngang */}
              <div className="flex items-center gap-[10px]">
                <div
                  className="w-[40px] h-[40px] rounded-full bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0"
                >
                  <CheckCircle2 size={20} color="#475569" />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-[#111827] m-0">
                    Tổng báo giá đề xuất
                  </h2>
                  <p className="text-[11.5px] text-[#6b7280] mt-[2px] mr-0 mb-0 ml-0">
                    Đã tính theo thông số hiện tại
                  </p>
                </div>
              </div>

              {/* Cấu thành giá + Tổng — gộp 1 card, breakdown chỉ ORDER/ADMIN xem (SALE không xem giá vốn) */}
              <div className="bg-surface border border-[#e5e7eb] rounded-[14px] p-[16px] flex flex-col gap-[9px]">
                {calcResult && (currentRole === 'ORDER' || currentRole === 'ADMIN') && (
                  <>
                    {calcResult.breakdown && calcResult.breakdown.length > 1 ? (
                      <div className="bg-[#f8fafc] py-[8px] px-[10px] rounded-[8px] mb-[4px] text-[11.5px] border border-[#e2e8f0]">
                        <div className="font-extrabold text-[#475569] mb-[4px]">Chi tiết từng kim loại:</div>
                        {calcResult.breakdown.map((b, i) => (
                          <div key={i} className="flex justify-between text-[#334155] mt-[2px]">
                            <span>• {b.materialName} ({b.weightChi} chỉ):</span>
                            <strong>{formatCurrency(b.cost)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <BreakdownRow label="Giá kim loại (giá gốc)" value={calcResult.metalRawCost ?? calcResult.totalMetalCost} />
                    <BreakdownRow label="Công chế tác" value={calcResult.laborCost} />
                    {calcResult.metalVatAmount != null && (
                      <BreakdownRow label="VAT kim loại" value={calcResult.metalVatAmount} />
                    )}
                    {calcResult.metalProfit != null && (
                      <BreakdownRow label="Tiền lãi kim loại" value={calcResult.metalProfit} accent="#15803d" />
                    )}
                    <div className="h-[1px] bg-[#e5e7eb] my-[2px]" />
                    <BreakdownRow label="Đá quý (giá gốc)" value={calcResult.stoneCost} />
                    {calcResult.stoneVatAmount != null && (
                      <BreakdownRow label="VAT đá quý" value={calcResult.stoneVatAmount} />
                    )}
                    {calcResult.stoneProfit != null && (
                      <BreakdownRow label="Tiền lãi đá quý" value={calcResult.stoneProfit} accent="#15803d" />
                    )}
                    <div className="h-[1px] bg-[#e5e7eb] my-[2px]" />
                  </>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] font-extrabold text-[#374151]">Tổng báo giá</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[24px] font-black text-[#0f172a] [font-variant-numeric:tabular-nums]">
                      {formatCurrency(quotedPrice)}
                    </span>
                    {quotedPrice != null && calcResult && renderPriceBreakdownLines(
                      getPriceBreakdown({
                        priceBreakdown: calcResult.materialPrice != null
                          ? { material: calcResult.materialPrice, stone: calcResult.stonePrice ?? 0 }
                          : null,
                      }),
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-[10px] mt-[4px]">
                {/* ORDER chỉ tính giá tham khảo, không tạo đơn — nút này chỉ dành cho SALE/ADMIN */}
                {currentRole !== 'ORDER' && (
                  <button
                    type="button"
                    disabled={isCalculating || quotedPrice === null}
                    onClick={() => {
                      if (isCalculating || quotedPrice === null) return;
                      const parts = materialRows
                        .filter((m) => m.materialName && (parseFloat(m.weightChi) || 0) > 0)
                        .map((m) => `${m.materialName}: ${m.weightChi} chỉ`);
                      stoneRows.forEach((r) => {
                        const name = stoneCatalog.find((s) => s.id === r.stoneId)?.name;
                        if (name) parts.push(`${name} x${r.qty}`);
                      });
                      const note = parts.join(', ');
                      const primaryMatName = materialRows[0]?.materialName || '';
                      onApplyToNewRequest?.({
                        suggestedPrice: quotedPrice,
                        categoryId,
                        materialType: primaryMatName,
                        materials: materialRows,
                        stones: stoneRows
                          .filter((r) => r.stoneId)
                          .map((r) => ({ stoneId: r.stoneId, quantity: r.qty })),
                        note,
                        options: priceOptions,
                      });
                    }}
                    className={clsx('w-full border border-[#cbd5e1] rounded-[12px] p-[16px] text-[15px] font-extrabold shadow-none transition-[all_0.2s_ease]', (isCalculating || quotedPrice === null) ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed opacity-70' : 'bg-[#f1f5f9] text-[#334155] cursor-pointer opacity-100')}
                  >
                    {isCalculating ? 'Đang tính toán...' : 'Tạo Đơn Với Giá Này →'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className={clsx('w-full bg-surface text-[#4b5563] border border-[#e5e7eb] rounded-[12px] p-[12px] text-[13px] font-bold flex items-center justify-center gap-[6px] transition-[all_0.2s_ease]', isCalculating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100')}
                >
                  <RotateCcw size={14} />
                  {isCalculating ? 'Đang tính lại...' : 'Tính lại giá'}
                </button>
              </div>
            </>
          )}

          {errorMessage && (
            <div className="text-[#b91c1c] text-[12px] bg-[#fef2f2] border border-[#fca5a5] p-[10px] rounded-[8px] w-full">
               {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BreakdownRow: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <div className="flex items-baseline justify-between">
    <span
      className={clsx('text-[12px]', accent ? 'font-bold' : 'font-normal text-[#6b7280]')}
      // động — giữ inline
      style={accent ? { color: accent } : undefined}
    >
      {label}
    </span>
    <span
      className={clsx('text-[13px] font-bold [font-variant-numeric:tabular-nums]', !accent && 'text-[#374151]')}
      // động — giữ inline
      style={accent ? { color: accent } : undefined}
    >
      {formatCurrency(value)}
    </span>
  </div>
);
