import React, { useEffect, useRef, useState } from 'react';
import { Calculator, CheckCircle2, RotateCcw, Copy, Check, Settings, Save } from 'lucide-react';
import type { Role } from '../types';
import { fetchMasterData, calculatePriceApi, generatePricingOptionsApi, updateMetalPrices, fetchPricingConfig, updatePricingConfig, fetchStones, fetchSilverMultipliers } from '../services/api';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { MetalPricesSettingsModal } from './MetalPricesSettingsModal';
import { VnGoldPriceTicker } from './VnGoldPriceTicker';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';

interface PricingCalculatorViewProps {
  currentRole?: Role;
  onApplyToNewRequest?: (productData: any) => void;
}

type StoneRow = {
  id: string;
  stoneId: string;
  type: string;
  sizeDesc: string;
  qty: number;
  pricePerUnit: number;
};

type StoneCatalogItem = { id: string; stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number };

type CalcResult = {
  totalMetalCost: number;
  laborCost: number;
  stoneCost: number;
  vatAmount: number;
  quotedPrice: number;
  profitMarginLabel?: string;
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 16px 0',
};

export const PricingCalculatorView: React.FC<PricingCalculatorViewProps> = ({
  currentRole,
  onApplyToNewRequest,
}) => {
  // Metal Prices hook (giá Vàng/Bạc luôn đọc trực tiếp từ DB qua BE) — đây là giá GỐC dùng để tính
  const {
    prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices, formatted,
  } = useMetalPrices();

  const [showPriceSettings, setShowPriceSettings] = useState(false);

  // SALE không được tùy chỉnh giá Vàng/Bạc, cũng không thấy khối giá tham khảo thị trường
  const isSale = currentRole === 'SALE';

  const handleSaveMetalPrices = async (payload: { gold24kVnd?: number; silverVnd?: number }) => {
    await updateMetalPrices(payload);
    await refreshPrices();
  };

  // Master Data from DB (Materials & Categories)
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string }[]>([]);

  // Form Input States
  const [categoryId, setCategoryId] = useState('');
  const [materialType, setMaterialType] = useState('Vàng Trắng 18K (75%)');
  const [weightChi, setWeightChi] = useState<string>(PRICING_DEFAULTS.WEIGHT_CHI);
  // Tiền công/VAT giờ là cấu hình chuẩn lưu DB (PricingConfig) — mặc định khóa (disabled),
  // chỉ ORDER/ADMIN bấm "Cấu hình" mới sửa được rồi "Lưu" mới ghi xuống DB.
  const [laborCost, setLaborCost] = useState<number>(PRICING_DEFAULTS.LABOR_COST);
  const [vatPct, setVatPct] = useState<number>(PRICING_DEFAULTS.VAT_PCT);
  // Sale chỉ chọn CÓ/KHÔNG cộng VAT, không tự set mức % (mức % luôn theo cấu hình chuẩn ORDER/ADMIN)
  const [includeVat, setIncludeVat] = useState<boolean>(true);
  const [isEditingCostConfig, setIsEditingCostConfig] = useState(false);
  const [savingCostConfig, setSavingCostConfig] = useState(false);
  const [savedCostConfig, setSavedCostConfig] = useState(false);
  const [costConfigError, setCostConfigError] = useState<string | null>(null);

  // Bạc dùng quy tắc riêng (giá vốn × hệ số nhân) — không tính tiền công/đá/VAT như vàng
  const isSilverMaterial = /BẠC|SILVER|925/i.test(materialType);
  // Hệ số nhân Bạc — danh sách lấy từ cấu hình, người dùng chọn muốn nhân với hệ số nào lúc tính giá
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  const [selectedSilverMultiplier, setSelectedSilverMultiplier] = useState<number>(3);

  // Stone Rows State - Starts empty
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);
  // 2 phương thức nhập giá đá theo mục 3.1: nhập tổng trực tiếp, hoặc tính từ bảng đá (mặc định)
  const [stoneInputMode, setStoneInputMode] = useState<'table' | 'total'>('table');
  const [manualStoneTotal, setManualStoneTotal] = useState<number>(0);

  // Kết quả tính giá — chỉ hiện sau khi bấm "Tính giá ngay" (không tự động gọi API khi gõ)
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  // Chi tiết cấu thành giá (giá kim loại/công/đá/VAT) — chỉ ORDER/ADMIN được xem, SALE chỉ thấy tổng
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Danh sách các phương án giá (VD: đủ giá 10K/14K/18K/610/24K khi chọn vàng) — để Sale copy nhanh
  const [priceOptions, setPriceOptions] = useState<{ optionName: string; materialName?: string; quotedPrice: number; isSelected?: boolean }[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Nhãn hiển thị bỏ phần "(Áp dụng X%)" cho gọn — số % vẫn dùng để tính, chỉ ẩn khỏi UI
  const cleanOptionLabel = (opt: { materialName?: string; optionName: string }) =>
    (opt.materialName || opt.optionName || '').replace(/\s*\(Áp dụng[^)]*\)/i, '').trim();

  const handleCopyPrice = (idx: number, opt: { materialName?: string; optionName: string; quotedPrice: number }) => {
    const text = `${cleanOptionLabel(opt)}: ${formatCurrency(opt.quotedPrice)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500);
    }).catch(() => {});
  };

  const handleCopyAllPrices = () => {
    const text = priceOptions
      .map((opt) => `${cleanOptionLabel(opt)}: ${formatCurrency(opt.quotedPrice)}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }).catch(() => {});
  };

  // Danh mục đá (đá chủ/đá tấm) lấy từ bảng Stone trong DB
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);
  useEffect(() => {
    fetchStones()
      .then((rows: StoneCatalogItem[]) => setStoneCatalog(Array.isArray(rows) ? rows : []))
      .catch((err) => console.error('Lỗi tải danh mục đá:', err));
  }, []);

  // Load Categories & Materials from DB
  useEffect(() => {
    fetchMasterData()
      .then((master) => {
        if (master?.categories && master.categories.length > 0) {
          setDbCategories(master.categories);
          setCategoryId(master.categories[0].id);
        }
        if (master?.materials && master.materials.length > 0) {
          setDbMaterials(master.materials);
          setMaterialType(master.materials[0].name);
        }
      })
      .catch((err) => console.error('Lỗi tải master data từ DB:', err));
  }, []);

  // Load VAT chuẩn từ PricingConfig — Sale không được gọi endpoint này (403), chỉ ORDER/ADMIN mới fetch
  useEffect(() => {
    if (isSale) return;
    fetchPricingConfig()
      .then((config: any) => {
        if (typeof config?.defaultVatRate === 'number') setVatPct(config.defaultVatRate);
      })
      .catch((err) => console.error('Lỗi tải cấu hình VAT chuẩn:', err));
  }, [isSale]);

  // Danh sách hệ số nhân Bạc — endpoint công khai cho mọi role (kể cả Sale) để chọn lúc tính giá
  useEffect(() => {
    fetchSilverMultipliers()
      .then((list) => {
        setSilverMultipliers(list);
        if (list.length > 0) setSelectedSilverMultiplier(list[0]);
      })
      .catch((err) => console.error('Lỗi tải hệ số nhân Bạc:', err));
  }, []);

  const handleSaveCostConfig = async () => {
    setSavingCostConfig(true);
    setCostConfigError(null);
    try {
      await updatePricingConfig({ defaultVatRate: vatPct });
      setSavedCostConfig(true);
      setIsEditingCostConfig(false);
      setTimeout(() => setSavedCostConfig(false), 1500);
    } catch (err: any) {
      setCostConfigError(err.message || 'Lưu cấu hình thất bại');
    } finally {
      setSavingCostConfig(false);
    }
  };

  // Stone management handlers
  const addStoneRow = () => {
    const first = stoneCatalog[0];
    setStoneRows((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        stoneId: first?.id || '',
        type: first?.name || '',
        sizeDesc: '',
        qty: 1,
        pricePerUnit: first?.price || 0,
      },
    ]);
  };

  const updateStoneRow = (id: string, patch: Partial<StoneRow>) => {
    setStoneRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  // Chọn đá từ danh mục — tự điền tên + giá gốc catalog, số lượng vẫn tự nhập
  const handlePickStone = (rowId: string, stoneId: string) => {
    const picked = stoneCatalog.find((s) => s.id === stoneId);
    if (!picked) return;
    updateStoneRow(rowId, { stoneId, type: picked.name, pricePerUnit: picked.price });
  };

  const removeStoneRow = (id: string) => {
    setStoneRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalStoneCost = stoneInputMode === 'total'
    ? (manualStoneTotal || 0)
    : stoneRows.reduce((sum, r) => sum + r.qty * r.pricePerUnit, 0);

  // requestId chặn race: nếu gõ tiếp trong lúc request cũ chưa về, kết quả cũ về sau bị bỏ qua
  const calcRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCalculate = async () => {
    const w = parseFloat(weightChi) || 0;
    if (!materialType || w <= 0) {
      setQuotedPrice(null);
      setCalcResult(null);
      setPriceOptions([]);
      setErrorMessage(null);
      return;
    }

    const requestId = ++calcRequestIdRef.current;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [res, options] = await Promise.all([
        calculatePriceApi({
          materialNameOrKey: materialType,
          weightChi: w,
          laborCost: laborCost || 0,
          stoneCost: totalStoneCost || 0,
          vatRate: vatPct || 0,
          includeVat,
          categoryId: categoryId || undefined,
          silverMultiplier: isSilverMaterial ? selectedSilverMultiplier : undefined,
        }),
        generatePricingOptionsApi({
          requestedMatName: materialType,
          weightChi: w,
          laborCost: laborCost || 0,
          stoneCost: totalStoneCost || 0,
          vatRate: vatPct || 0,
          includeVat,
          categoryId: categoryId || undefined,
          silverMultiplier: isSilverMaterial ? selectedSilverMultiplier : undefined,
        }).catch(() => []),
      ]);

      if (requestId !== calcRequestIdRef.current) return; // đã có input mới hơn, bỏ kết quả cũ này

      if (res && typeof res.quotedPrice === 'number' && Number.isFinite(res.quotedPrice)) {
        setQuotedPrice(res.quotedPrice);
        setCalcResult(res);
      } else {
        setQuotedPrice(null);
        setCalcResult(null);
        setErrorMessage('Không nhận được giá hợp lệ từ hệ thống');
      }
      setPriceOptions(Array.isArray(options) ? options : []);
    } catch (err: any) {
      if (requestId !== calcRequestIdRef.current) return;
      console.error('Lỗi tính giá BE:', err);
      setErrorMessage(err.message || 'Không thể tính giá từ hệ thống');
    } finally {
      if (requestId === calcRequestIdRef.current) setLoading(false);
    }
  };

  // Kết quả tính giá real-time khi nhập liệu (mục 8.1) — debounce 500ms sau lần gõ cuối để khỏi spam API
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runCalculate();
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialType, weightChi, laborCost, vatPct, includeVat, categoryId, selectedSilverMultiplier, stoneRows, stoneInputMode, manualStoneTotal, prices.gold24kVnd, prices.silverVnd]);

  // Nút "Tính giá ngay" / "Tính lại giá" — bấm để tính ngay, khỏi chờ debounce
  const handleCalculate = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
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
            <h3 style={cardTitleStyle}>Thông số Sản phẩm & Kim loại</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Danh mục sản phẩm */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  DANH MỤC SẢN PHẨM
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff' }}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {dbCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  {dbCategories.length === 0 && (
                    <>
                      <option value="ring">Nhẫn</option>
                      <option value="necklace">Dây chuyền / Mặt dây</option>
                      <option value="earring">Bông tai</option>
                      <option value="bracelet">Vòng / Lắc tay</option>
                      <option value="set">Bộ trang sức</option>
                    </>
                  )}
                </select>
              </div>

              {/* Loại vàng / Chất liệu */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  LOẠI VÀNG / CHẤT LIỆU
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', background: '#ffffff' }}
                >
                  {dbMaterials.length > 0 ? (
                    dbMaterials.map((mat) => (
                      <option key={mat.id} value={mat.name}>
                        {mat.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Vàng Trắng 18K (75%)">Vàng Trắng 18K (75%)</option>
                      <option value="Vàng Trắng 14K (58.5%)">Vàng Trắng 14K (58.5%)</option>
                      <option value="Vàng 24K Nguyên Khối (99.9%)">Vàng 24K Nguyên Khối (99.9%)</option>
                      <option value="Vàng 10K (41.6%)">Vàng 10K (41.6%)</option>
                      <option value="Bạc 925">Bạc 925 Cao Cấp</option>
                    </>
                  )}
                </select>
              </div>

              {/* Trọng lượng */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  TRỌNG LƯỢNG (CHỈ)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={weightChi}
                    onChange={(e) => setWeightChi(e.target.value)}
                    style={{ width: '100%', padding: '10px 45px 10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                    chỉ
                  </span>
                </div>
              </div>
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

            {/* Hệ số nhân Bạc — chọn muốn nhân với hệ số nào, hiện cho mọi role khi chất liệu là Bạc */}
            {isSilverMaterial && (
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

            {/* Thanh giá nhanh — GIÁ GỐC dùng để tính giá. Sale không xem giá vàng/bạc gốc, chỉ nhập rồi bấm Tính giá. */}
            {!isSale && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Giá Vàng 24K */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      GIÁ VÀNG 24K (GOLD)
                    </span>
                    <strong style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', letterSpacing: '0.3px', fontVariantNumeric: 'tabular-nums' }}>
                      {formatted.gold24k} <span style={{ fontSize: '13px', fontWeight: 700 }}>đ/chỉ</span>
                    </strong>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />

                  {/* Giá Bạc */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      GIÁ BẠC (SILVER)
                    </span>
                    <strong style={{ fontSize: '13px', fontWeight: 800, color: '#334155', letterSpacing: '0.3px', fontVariantNumeric: 'tabular-nums' }}>
                      {formatted.silver} <span style={{ fontSize: '13px', fontWeight: 700 }}>đ/chỉ</span>
                    </strong>
                  </div>
                </div>

                {/* Nút Tùy chỉnh — SALE không được tùy chỉnh giá Vàng/Bạc */}
                <button
                  type="button"
                  onClick={() => setShowPriceSettings(true)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  Tùy chỉnh giá Vàng & Bạc
                </button>
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
                      border: stoneInputMode === 'table' ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
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
                      border: stoneInputMode === 'total' ? '1.5px solid #ea580c' : '1px solid #cbd5e1',
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
                          <div>
                            <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                              Loại Đá
                            </label>
                            <select
                              value={row.stoneId}
                              onChange={(e) => handlePickStone(row.id, e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 600, background: '#ffffff' }}
                            >
                              <option value="">-- Chọn đá --</option>
                              <optgroup label="Đá chủ">
                                {stoneCatalog.filter((s) => s.stoneType === 'MAIN').map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}{s.size ? ` (${s.size})` : ''}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Đá tấm">
                                {stoneCatalog.filter((s) => s.stoneType === 'SIDE').map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}{s.size ? ` (${s.size})` : ''}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '10px' }}>
                            <div>
                              <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                Kích thước (mm) / Trọng lượng (carat)
                              </label>
                              <input
                                type="text"
                                value={row.sizeDesc}
                                onChange={(e) => updateStoneRow(row.id, { sizeDesc: e.target.value })}
                                placeholder="VD: 3mm hoặc 0.05ct"
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                SL viên
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={row.qty}
                                onChange={(e) => updateStoneRow(row.id, { qty: parseInt(e.target.value, 10) || 1 })}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, background: '#ffffff', textAlign: 'right' }}
                              />
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                              Đơn giá / viên (VNĐ)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumberVN(row.pricePerUnit)}
                              onChange={(e) => updateStoneRow(row.id, { pricePerUnit: parseFloat(e.target.value.replace(/\D/g, '')) || 0 })}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, background: '#ffffff', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                            />
                          </div>

                          {/* Thành tiền = Số lượng × Đơn giá (mục 3.2) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Thành tiền</span>
                            <strong style={{ fontSize: '13px', color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                              {formatCurrency(row.qty * row.pricePerUnit)}
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
                    Bấm <strong>"+ THÊM ĐÁ"</strong> ở trên để nhập danh sách đá quý
                  </div>
                )}
              </div>

              {/* Section 3: Chế tác & Phí dịch vụ — cấu hình chuẩn lưu DB, mặc định khóa, bấm "Cấu hình" mới sửa được */}
              {!isSale && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ ...cardTitleStyle, margin: 0 }}>Chế tác & Phí dịch vụ</h3>
                    {isEditingCostConfig ? (
                      <button
                        type="button"
                        onClick={handleSaveCostConfig}
                        disabled={savingCostConfig || savedCostConfig}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: savedCostConfig ? '#16a34a' : '#0f172a', border: 'none', borderRadius: '6px',
                          color: '#ffffff', fontSize: '12px', fontWeight: 800, padding: '6px 14px',
                          cursor: (savingCostConfig || savedCostConfig) ? 'default' : 'pointer', opacity: savingCostConfig ? 0.7 : 1,
                        }}
                      >
                        {savedCostConfig ? <><CheckCircle2 size={13} /> Đã lưu!</> : <><Save size={13} /> {savingCostConfig ? 'Đang lưu...' : 'Lưu'}</>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingCostConfig(true)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          background: '#f3f3f3', border: '1px solid #a3a3a3', borderRadius: '6px',
                          color: '#000000', fontSize: '12px', fontWeight: 800, padding: '6px 14px', cursor: 'pointer',
                        }}
                      >
                        <Settings size={13} /> Cấu hình
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        TIỀN CÔNG CHẾ TÁC (VNĐ)
                      </label>
                      <input
                        type="text"
                        value={formatNumberVN(laborCost)}
                        onChange={(e) => setLaborCost(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                        THUẾ VAT (%)
                      </label>
                      <input
                        type="number"
                        value={vatPct}
                        onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                        disabled={!isEditingCostConfig}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none', fontVariantNumeric: 'tabular-nums', background: isEditingCostConfig ? '#ffffff' : '#f1f5f9', color: isEditingCostConfig ? '#0f172a' : '#64748b', cursor: isEditingCostConfig ? 'text' : 'not-allowed' }}
                      />
                    </div>

                    {costConfigError && (
                      <div style={{ color: '#b91c1c', fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px' }}>
                         {costConfigError}
                      </div>
                    )}
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
                      background: opt.isSelected ? '#fffbeb' : '#f8fafc',
                      border: opt.isSelected ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
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
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(opt.quotedPrice)}
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
                    background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Calculator size={20} color="#ffffff" />
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
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#78350f',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Đang tính giá...' : 'Tính giá ngay'}
              </button>
            </>
          ) : (
            <>
              {/* Calculated Result View — đã chốt, header gọn nằm ngang */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={20} color="#ffffff" />
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
                    <BreakdownRow label="Giá kim loại (theo trọng lượng)" value={calcResult.totalMetalCost} />
                    <BreakdownRow label="Đá quý" value={calcResult.stoneCost} />
                    <BreakdownRow label="Công chế tác" value={calcResult.laborCost} />
                    <BreakdownRow label="VAT" value={calcResult.vatAmount} />
                    <BreakdownRow
                      label={`Tiền lãi`}
                      value={quotedPrice !== null ? quotedPrice - calcResult.totalMetalCost - calcResult.stoneCost - calcResult.laborCost - calcResult.vatAmount : 0}
                      accent="#15803d"
                    />
                    <div style={{ height: '1px', background: '#e5e7eb', margin: '2px 0' }} />
                  </>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#374151' }}>Tổng báo giá</span>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(quotedPrice)}
                  </span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                {/* ORDER chỉ tính giá tham khảo, không tạo đơn — nút này chỉ dành cho SALE/ADMIN */}
                {currentRole !== 'ORDER' && (
                  <button
                    type="button"
                    onClick={() => {
                      const parts = [`${materialType}: ${weightChi} chỉ`];
                      stoneRows.forEach((r) => {
                        parts.push(r.sizeDesc.trim() ? `${r.type}: ${r.sizeDesc.trim()}` : r.type);
                      });
                      const note = parts.join(', ');
                      onApplyToNewRequest?.({ suggestedPrice: quotedPrice, categoryId, materialType, note, options: priceOptions });
                    }}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#78350f',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    Tạo Đơn Với Giá Này →
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCalculate}
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    color: '#4b5563',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  <RotateCcw size={14} />
                  {loading ? 'Đang tính lại...' : 'Tính lại giá'}
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

      <MetalPricesSettingsModal
        isOpen={showPriceSettings}
        onClose={() => setShowPriceSettings(false)}
        prices={prices}
        loading={pricesLoading}
        error={pricesError}
        onRefresh={refreshPrices}
        onSave={handleSaveMetalPrices}
      />
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
