import React, { useEffect, useRef, useState } from 'react';
import { Calculator, CheckCircle2, RotateCcw, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { fetchMasterData, calculatePriceMultiApi, calculatePriceBatchApi, fetchStones, fetchSilverMultipliers } from '../services/api';
import type { CalculateBatchResultItem } from '../services/api';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { VnGoldPriceTicker } from '../components/VnGoldPriceTicker';
import type {CalculatorPageProps, StoneRow,StoneCatalogItem,CalcResult} from '../types';
import {cardStyle, cardTitleStyle} from '../styles/card';
import { useMaterialStoneRows } from '../hooks/useMaterialStoneRows';

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
  // State + CRUD của materialRows/stoneRows dùng chung với PricingModal qua hook này (xem
  // hooks/useMaterialStoneRows.ts) — trước đây 2 file tự viết riêng cùng 1 logic add/update/remove.
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
    stonePricePerUnit,
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

  // Phương án so sánh loại vàng khác — người dùng TỰ thêm, không còn tự sinh từ BE. Mỗi dòng chọn
  // 1 chất liệu khác + PHẢI nhập khối lượng riêng (tuổi vàng khác nhau khối lượng khác nhau). Tính
  // riêng từng dòng qua /quote-options/calculate, gắn locked=true (chỉ tham khảo).
  const [compareRows, setCompareRows] = useState<
    { id: string; materialId: string; materialName: string; weightChi: string }[]
  >([]);
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
  const [priceOptions, setPriceOptions] = useState<any[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Nhãn hiển thị bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính, chỉ ẩn khỏi UI
  const cleanOptionLabel = (opt: { materialName?: string; optionName: string }) =>
    (opt.materialName || opt.optionName || '').replace(/\s*\(Áp dụng[^)]*\)/i, '').trim();

  const handleCopyPrice = (idx: number, opt: any) => {
    const bd = getPriceBreakdown(opt as any);
    const suffix = bd && bd.stone > 0
      ? ` (Giá chất liệu: ${formatCurrency(bd.material)} · Giá đá: ${formatCurrency(bd.stone)})`
      : '';
    const text = `${cleanOptionLabel(opt)}: ${formatCurrency(opt.quotedPrice)}${suffix}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAllPrices = () => {
    const text = priceOptions
      .map((opt) => {
        const bd = getPriceBreakdown(opt as any);
        const suffix = bd && bd.stone > 0
          ? ` (Giá chất liệu: ${formatCurrency(bd.material)} · Giá đá: ${formatCurrency(bd.stone)})`
          : '';
        return `${cleanOptionLabel(opt)}: ${formatCurrency(opt.quotedPrice)}${suffix}`;
      })
      .join('\n');
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
  }, []);

  // VAT & tiền công chuẩn nạp theo danh mục sản phẩm đang chọn (ProductCategory.vatRate/laborCost)
  // — không còn 1 giá trị mặc định global. Đổi danh mục thì đổi luôn VAT/công gợi ý, và vì cả 2
  // đều nằm trong dependencies của effect tính giá debounce bên dưới nên đổi danh mục sẽ tự tính
  // lại giá luôn (trước đây laborCost không đồng bộ theo danh mục nên đổi danh mục không đổi giá).
  useEffect(() => {
    if (!categoryId) return;
    const cat = dbCategories.find((c) => c.id === categoryId);
    if (cat?.vatRate != null) setVatPct(Number(cat.vatRate));
    if (cat?.laborCost != null) setLaborCost(Number(cat.laborCost));
  }, [categoryId, dbCategories]);

  const totalStoneCost = stoneInputMode === 'total'
    ? (manualStoneTotal || 0)
    : stoneRows.reduce((sum, r) => sum + r.qty * stonePricePerUnit(r.stoneId), 0);

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
      stoneCost: totalStoneCost || 0,
      vatRate: vatPct || 0,
      silverMultiplier: cSilver ? selectedSilverMultiplier : undefined,
    };
  };

  // Map 1 kết quả batch thành phương án "loại vàng khác" (locked). Thuần, không gọi API.
  const mapCompareOpt = (
    r: { materialId: string; materialName: string; weightChi: string },
    cr: CalculateBatchResultItem | undefined,
    vatValNum: number,
    sharedStones: { stoneId: string; quantity: number }[] | undefined,
  ): any | null => {
    if (!cr || cr.error || typeof cr.quotedPrice !== 'number') return null;
    const cw = parseFloat(r.weightChi) || 0;
    return {
      optionName: `${r.materialName} · ${cw} chỉ · Loại vàng khác (tham khảo)`,
      materialName: r.materialName,
      weightChi: cw,
      laborCost: cr.laborCost,
      stoneCost: cr.stoneCost,
      totalMetalCost: cr.totalMetalCost,
      metalRawCost: cr.metalRawCost,
      stonePrice: cr.stonePrice,
      vat: vatValNum,
      quotedPrice: cr.quotedPrice,
      isSelected: false,
      locked: true,
      materials: r.materialId ? [{ materialId: r.materialId, weightChi: cw }] : undefined,
      stones: sharedStones,
    };
  };

  // Các phương án "loại vàng khác" (compareRows) — bỏ qua dòng chưa nhập khối lượng, tính TẤT CẢ
  // trong 1 request /quote-options/calculate-batch (trước đây mỗi dòng 1 request /calculate).
  const buildCompareOptions = async (
    vatValNum: number,
    sharedStones: { stoneId: string; quantity: number }[] | undefined,
    currentCatId: string | undefined,
  ): Promise<any[]> => {
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
      .filter((o): o is any => !!o);
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
          stoneInputMode === 'table' && stoneRows.length > 0
            ? stoneRows.filter((r) => r.stoneId).map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
            : undefined;
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
              stoneCost: totalStoneCost || 0,
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
            vatRate: vatPct || 10,
            vatAmount: res.vatAmount ?? 0,
            quotedPrice: res.quotedPrice,
            profitMarginLabel: res.profitMarginLabel,
          });
        } else {
          setQuotedPrice(null);
          setCalcResult(null);
          setErrorMessage(res?.error || 'Không nhận được giá hợp lệ từ hệ thống');
        }

        const mainOption = {
          optionName: singleRow.materialName,
          materialName: singleRow.materialName,
          weightChi: w,
          laborCost: res?.laborCost,
          stoneCost: res?.stoneCost,
          totalMetalCost: res?.totalMetalCost,
          metalRawCost: res?.metalRawCost,
          stonePrice: res?.stonePrice,
          vat: vatValNum,
          quotedPrice: res?.quotedPrice,
          isSelected: true,
          materials: singleRow.materialId
            ? [{ materialId: singleRow.materialId, weightChi: w }]
            : undefined,
          stones: sharedStones,
        };

        const compareOptions = compareValid
          .map((r, i) => mapCompareOpt(r, batch[i + 1], vatValNum, sharedStones))
          .filter((o): o is any => !!o);

        setPriceOptions(
          res?.quotedPrice != null ? [mainOption, ...compareOptions] : compareOptions,
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
          stones: stoneInputMode === 'table' && stoneRows.length > 0
            ? stoneRows.filter((r) => r.stoneId).map((r) => ({ stoneId: r.stoneId, quantity: r.qty }))
            : undefined,
          manualStoneName: stoneInputMode === 'total' && manualStoneTotal > 0 ? 'Đá tổng' : undefined,
          manualStonePrice: stoneInputMode === 'total' && manualStoneTotal > 0 ? manualStoneTotal : undefined,
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
            laborCost: res.laborCost,
            stoneCost: res.stoneCost,
            stonePrice: res.stonePrice || 0,
            vatRate: vatPct || 10,
            vatAmount: res.vatAmount,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '30px', fontFamily: "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Giá vàng thị trường theo tuổi — đặt lên đầu trang, ẩn với SALE */}
      {!isSale && <VnGoldPriceTicker />}

      {/* Layout chính: trái nhập liệu, phải bảng báo giá sống (sticky) */}
      <div className="pricing-calc-grid">
        {/* Cột trái: nhập liệu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Section 1: Thông số Sản phẩm & Kim loại */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ ...cardTitleStyle, margin: 0 }}>Thông số Sản phẩm & Kim loại</h3>
              <button
                type="button"
                onClick={addMaterialRow}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
                  color: '#334155', fontSize: '12px', fontWeight: 800, padding: '7px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={14} color="#475569" /> Thêm chất liệu
              </button>
            </div>

            {/* Danh mục sản phẩm */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                DANH MỤC SẢN PHẨM
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff' }}
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
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc' }}>
              {/* Header cột cố định */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 36px',
                  gap: '12px',
                  marginBottom: '8px',
                  padding: '0 2px',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  LOẠI VÀNG / CHẤT LIỆU
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  TRỌNG LƯỢNG (CHỈ)
                </span>
                <span />
              </div>

              {/* Danh sách các dòng chất liệu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {materialRows.map((row) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 36px',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <select
                      value={row.materialId || ''}
                      onChange={(e) => updateMaterialRow(row.id, { materialId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        fontWeight: 700,
                        outline: 'none',
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
                        style={{
                          width: '100%',
                          padding: '9px 42px 9px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: 700,
                          outline: 'none',
                          background: '#ffffff',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                        chỉ
                      </span>
                    </div>

                    {materialRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(row.id)}
                        title="Xóa chất liệu này"
                        style={{
                          height: '36px',
                          width: '36px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div style={{ width: '36px', height: '36px' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Tổng khối lượng khi có từ 2 chất liệu trở lên */}
              {materialRows.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', marginTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '12px', color: '#475569' }}>
                  <span style={{ fontWeight: 700 }}>Tổng khối lượng:</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {materialRows.reduce((sum, r) => sum + (parseFloat(r.weightChi) || 0), 0).toFixed(2)} chỉ
                  </strong>
                </div>
              )}
            </div>

            {/* Phương án so sánh loại vàng khác — TỰ thêm, không còn tự sinh từ BE. Mỗi loại vàng
                PHẢI nhập khối lượng riêng; kết quả là phương án "chỉ tham khảo". */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Phương án so sánh loại vàng khác (tham khảo)
                </span>
                <button
                  type="button"
                  onClick={addCompareRow}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px',
                    color: '#334155', fontSize: '12px', fontWeight: 800, padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} color="#475569" /> Thêm phương án
                </button>
              </div>

              {compareRows.length === 0 ? (
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0 }}>
                  Thêm loại vàng khác để báo khách tham khảo — mỗi loại phải nhập khối lượng riêng.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {compareRows.map((row) => {
                    const missingWeight = !((parseFloat(row.weightChi) || 0) > 0);
                    return (
                      <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 36px', gap: '12px', alignItems: 'center' }}>
                        <select
                          value={row.materialId || ''}
                          onChange={(e) => updateCompareRow(row.id, { materialId: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff' }}
                        >
                          {dbMaterials.map((mat) => (
                            <option key={mat.id} value={mat.id}>{mat.name}</option>
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
                              updateCompareRow(row.id, { weightChi: v });
                            }}
                            placeholder="Số chỉ"
                            style={{
                              width: '100%', padding: '9px 42px 9px 12px', borderRadius: '8px',
                              border: missingWeight ? '1px solid #f87171' : '1px solid #cbd5e1',
                              fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                            chỉ
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCompareRow(row.id)}
                          title="Xóa phương án so sánh này"
                          style={{ height: '36px', width: '36px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Dòng chưa nhập khối lượng sẽ bị bỏ qua khi tính.
                  </span>
                </div>
              )}
            </div>

            {/* Sale: chỉ chọn CÓ/KHÔNG cộng VAT, không thấy/nhập được mức % (mức % do ORDER/ADMIN cấu hình) */}
            {isSale && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', cursor: 'pointer', width: 'fit-content' }}>
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>Cộng VAT vào báo giá</span>
              </label>
            )}

            {/* Hệ số nhân Bạc — chỉ ORDER/ADMIN được chọn, Sale luôn dùng mặc định (server ép, FE ẩn cho khỏi rối) */}
            {isSilverMaterial && !isSale && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Hệ số nhân Bạc</label>
                <select
                  value={selectedSilverMultiplier}
                  onChange={(e) => setSelectedSilverMultiplier(parseFloat(e.target.value) || 0)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff' }}
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
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                {baseMetals.map((m, idx) => (
                  <React.Fragment key={m.id}>
                    {idx > 0 && <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        GIÁ {m.name.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '19px', fontWeight: 900, color: '#334155', letterSpacing: '0.3px', fontVariantNumeric: 'tabular-nums' }}>
                        {formatNumberVN(m.priceVnd)} <span style={{ fontSize: '14px', fontWeight: 700 }}>đ/chỉ</span>
                      </strong>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Section 2 + 3: Đá quý & Chế tác — gộp lưới 2 cột con để giảm chiều cao trang. Bạc dùng chung công/đá, chỉ ẩn riêng ô VAT (Bạc không tính VAT). */}
          {(
            <div className="pricing-calc-subgrid" style={isSale ? { gridTemplateColumns: '1fr' } : undefined}>
              {/* Section 2: Thông số Đá quý — 2 phương thức nhập theo mục 3.1: nhập tổng trực tiếp, hoặc bảng tính từng viên */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ ...cardTitleStyle, margin: 0 }}>Thông số Đá quý</h3>
                  {stoneInputMode === 'table' && (
                    <button
                      type="button"
                      onClick={addStoneRow}
                      style={{
                        background: '#f3f3f3',
                        border: '1px solid #a3a3a3',
                        color: '#000000',
                        fontSize: '12px',
                        fontWeight: 800,
                        borderRadius: '6px',
                        padding: '6px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      + THÊM ĐÁ
                    </button>
                  )}
                </div>

                {/* Chọn phương thức nhập */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => setStoneInputMode('table')}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                      border: stoneInputMode === 'table' ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                      background: stoneInputMode === 'table' ? '#fff7ed' : '#ffffff',
                      color: stoneInputMode === 'table' ? '#c2410c' : '#64748b',
                    }}
                  >
                    Tính từ bảng đá
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoneInputMode('total')}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                      border: stoneInputMode === 'total' ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                      background: stoneInputMode === 'total' ? '#fff7ed' : '#ffffff',
                      color: stoneInputMode === 'total' ? '#c2410c' : '#64748b',
                    }}
                  >
                    Nhập tổng tiền đá
                  </button>
                </div>

                {stoneInputMode === 'total' ? (
                  /* Nhập tổng tiền đá trực tiếp — đã biết giá, khỏi khai từng viên */
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      TỔNG TIỀN ĐÁ (VNĐ)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatNumberVN(manualStoneTotal)}
                      onChange={(e) => setManualStoneTotal(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                    />
                  </div>
                ) : stoneRows.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stoneRows.map((row) => (
                      <div
                        key={row.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '6px' }}>
                          <button
                            type="button"
                            onClick={() => removeStoneRow(row.id)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                Loại đá
                              </label>
                              <select
                                value={row.stoneType}
                                onChange={(e) => updateStoneRow(row.id, { stoneType: e.target.value as StoneRow['stoneType'], stoneId: '' })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 600, background: '#ffffff' }}
                              >
                                <option value="">-- Chọn loại --</option>
                                <option value="MAIN">Đá chủ</option>
                                <option value="SIDE">Đá tấm</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                Sản phẩm đá
                              </label>
                              <select
                                value={row.stoneId}
                                disabled={!row.stoneType}
                                onChange={(e) => updateStoneRow(row.id, { stoneId: e.target.value })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 600, background: row.stoneType ? '#ffffff' : '#f1f5f9' }}
                              >
                                <option value="">-- Chọn sản phẩm --</option>
                                {stoneCatalog.filter((s) => s.stoneType === row.stoneType).map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}{s.size ? ` (${s.size})` : ''}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                              SL viên
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={(e) => updateStoneRow(row.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, background: '#ffffff', textAlign: 'right' }}
                            />
                          </div>

                          {/* Đơn giá/viên lấy từ cấu hình catalog đá trong DB — không sửa tay */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Giá cốt / viên</span>
                            <strong style={{ fontSize: '12.5px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(stonePricePerUnit(row.stoneId))}
                            </strong>
                          </div>

                          {/* Thành tiền = Số lượng × Đơn giá catalog (mục 3.2) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Thành tiền</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(row.qty * stonePricePerUnit(row.stoneId))}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Tổng cộng tất cả các loại đá = Tổng tiền đá (mục 3.2) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 4px 0 4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#374151' }}>Tổng tiền đá</span>
                      <strong style={{ fontSize: '15px', color: '#c2410c', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(totalStoneCost)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', padding: '24px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    Bấm <strong>"THÊM ĐÁ"</strong> ở trên để nhập danh sách đá quý
                  </div>
                )}
              </div>

              {/* Section 3: Chế tác & Phí dịch vụ — tiền công/VAT sửa trực tiếp cho báo giá đang tính,
                  không ghi đè cấu hình chuẩn (Material.laborCost/PricingConfig.defaultVatRate) */}
              {!isSale && (
                <div style={cardStyle}>
                  <h3 style={{ ...cardTitleStyle, margin: '0 0 16px 0' }}>Chế tác & Phí dịch vụ</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        TIỀN CÔNG CHẾ TÁC (VNĐ)
                      </label>
                      <input
                        type="text"
                        value={formatNumberVN(laborCost)}
                        onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value.replace(/\D/g, '')) || 0))}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
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
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Các Phương Án Giá — Sale copy nhanh gửi khách (cập nhật sống cùng lúc với bảng bên phải) */}
          {priceOptions.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ ...cardTitleStyle, margin: 0 }}>Các Phương Án Giá</h3>
                <button
                  type="button"
                  onClick={handleCopyAllPrices}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px', borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: copiedAll ? '#dcfce7' : '#ffffff',
                    color: copiedAll ? '#16a34a' : '#475569',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {copiedAll ? <Check size={13} /> : <Copy size={13} />}
                  {copiedAll ? 'Đã copy hết!' : 'Copy hết'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {priceOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: opt.isSelected ? '#f1f5f9' : '#f8fafc',
                      border: opt.isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cleanOptionLabel(opt)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(opt.quotedPrice)}
                        </div>
                        {renderPriceBreakdownLines(getPriceBreakdown(opt))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPrice(idx, opt)}
                      title="Copy giá"
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: copiedIdx === idx ? '#dcfce7' : '#ffffff',
                        color: copiedIdx === idx ? '#16a34a' : '#475569',
                        cursor: 'pointer',
                      }}
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
          style={{
            background: '#F3F4F6',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: '24px',
            padding: '26px',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'sticky',
            top: '20px',
          }}
        >
          {quotedPrice === null ? (
            <>
              {/* Trạng thái chưa tính — chỉ hiện số sau khi bấm nút, header gọn nằm ngang */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Calculator size={20} color="#475569" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#111827', margin: 0 }}>
                    Sẵn sàng tính giá
                  </h2>
                  <p style={{ fontSize: '11.5px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Nhập trọng lượng — giá tự động cập nhật, hoặc bấm tính ngay
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={isCalculating}
                style={{
                  width: '100%',
                  background: isCalculating ? '#e2e8f0' : '#f1f5f9',
                  color: isCalculating ? '#94a3b8' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: isCalculating ? 'not-allowed' : 'pointer',
                  boxShadow: 'none',
                  opacity: isCalculating ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isCalculating ? 'Đang tính giá...' : 'Tính giá ngay'}
              </button>
            </>
          ) : (
            <>
              {/* Calculated Result View — đã chốt, header gọn nằm ngang */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={20} color="#475569" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#111827', margin: 0 }}>
                    Tổng báo giá đề xuất
                  </h2>
                  <p style={{ fontSize: '11.5px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Đã tính theo thông số hiện tại
                  </p>
                </div>
              </div>

              {/* Cấu thành giá + Tổng — gộp 1 card, breakdown chỉ ORDER/ADMIN xem (SALE không xem giá vốn) */}
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {calcResult && (currentRole === 'ORDER' || currentRole === 'ADMIN') && (
                  <>
                    {calcResult.breakdown && calcResult.breakdown.length > 1 ? (
                      <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', marginBottom: '4px', fontSize: '11.5px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 800, color: '#475569', marginBottom: '4px' }}>Chi tiết từng kim loại:</div>
                        {calcResult.breakdown.map((b, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', marginTop: '2px' }}>
                            <span>• {b.materialName} ({b.weightChi} chỉ):</span>
                            <strong>{formatCurrency(b.cost)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <BreakdownRow label="Giá kim loại (giá gốc)" value={calcResult.metalRawCost ?? calcResult.totalMetalCost} />
                    <BreakdownRow label="Công chế tác" value={calcResult.laborCost} />
                    <BreakdownRow label="VAT kim loại" value={calcResult.vatAmount} />
                    <BreakdownRow
                      label="Tiền lãi kim loại"
                      value={
                        calcResult.metalRawCost != null
                          ? calcResult.totalMetalCost - (calcResult.metalRawCost + calcResult.laborCost) * (1 + (calcResult.vatRate || 10) / 100)
                          : 0
                      }
                      accent="#15803d"
                    />
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '2px 0' }} />
                    <BreakdownRow label="Đá quý (giá gốc)" value={calcResult.stoneCost} />
                    <BreakdownRow label="VAT đá quý" value={calcResult.stoneCost * ((calcResult.vatRate || 10) / 100)} />
                    <BreakdownRow
                      label="Tiền lãi đá quý"
                      value={calcResult.stonePrice - calcResult.stoneCost * (1 + (calcResult.vatRate || 10) / 100)}
                      accent="#15803d"
                    />
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '2px 0' }} />
                  </>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#374151' }}>Tổng báo giá</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(quotedPrice)}
                    </span>
                    {quotedPrice != null && calcResult && renderPriceBreakdownLines(
                      getPriceBreakdown({
                        quotedPrice,
                        stonePrice: calcResult.stonePrice ?? null,
                        priceBreakdown: calcResult.materialPrice != null
                          ? { material: calcResult.materialPrice, stone: Math.round(Number(calcResult.stonePrice) || 0) }
                          : undefined,
                      }),
                    )}
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
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
                    style={{
                      width: '100%',
                      background: (isCalculating || quotedPrice === null) ? '#e2e8f0' : '#f1f5f9',
                      color: (isCalculating || quotedPrice === null) ? '#94a3b8' : '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: (isCalculating || quotedPrice === null) ? 'not-allowed' : 'pointer',
                      boxShadow: 'none',
                      transition: 'all 0.2s ease',
                      opacity: (isCalculating || quotedPrice === null) ? 0.7 : 1,
                    }}
                  >
                    {isCalculating ? 'Đang tính toán...' : 'Tạo Đơn Với Giá Này →'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    color: '#4b5563',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isCalculating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: isCalculating ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <RotateCcw size={14} />
                  {isCalculating ? 'Đang tính lại...' : 'Tính lại giá'}
                </button>
              </div>
            </>
          )}

          {errorMessage && (
            <div style={{ color: '#b91c1c', fontSize: '12px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px', width: '100%' }}>
               {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BreakdownRow: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <span style={{ fontSize: '12px', color: accent || '#6b7280', fontWeight: accent ? 700 : 400 }}>{label}</span>
    <span style={{ fontSize: '13px', fontWeight: 700, color: accent || '#374151', fontVariantNumeric: 'tabular-nums' }}>
      {formatCurrency(value)}
    </span>
  </div>
);
