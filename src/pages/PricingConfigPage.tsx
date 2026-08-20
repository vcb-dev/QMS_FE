import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Pencil, Check, X, Upload, AlertTriangle, RotateCcw, Loader2, CheckCircle2, XCircle, FileText, Wrench } from 'lucide-react';
import {
  fetchPricingConfig,
  updatePricingConfig,
  fetchStones,
  createStone,
  updateStonePrices,
  deleteStonesMany,
  importStonesExcel,
  fetchMasterData,
  updateProductCategoryLaborCosts,
  createProductCategory,
  deleteProductCategoriesMany,
  fetchMetalPrices,
  updateMetalPrices,
} from '../services/api';
import { formatNumberVN } from '../utils/currency';
import type{GoldRatio, ProfitMargin, ConfigSnapshot, MetalPricesState, StoneItem, CategoryItem} from '../types';
import {UNLIMITED_MAX_COST, STONE_PAGE_SIZE, CATEGORY_PAGE_SIZE} from "../constants/index";
import {PRIMARY_BLUE,PRIMARY_DARK,thStyle,tdStyle,tdCenterStyle,tableHeadRowStyle,labelStyle, btnPrimaryStyle, btnSecondaryStyle, btnGhostSmallStyle, iconBtnStyle,pageBtnStyle, inputStyle, valueBoxStyle, suffixStyle, fieldErrorStyle } from '../styles/card';
const toggleInArray = <T,>(arr: T[], val: T): T[] => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

// ==========================
// Small shared components
// ==========================

const SectionHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a', flexShrink: 0 }} />
      <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, wordBreak: 'keep-all' }}>{title}</h3>
    </div>
    {action}
  </div>
);

const PanelSection: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; first?: boolean }> = ({ title, action, children, first }) => (
  <div style={{ padding: '22px 0', borderTop: first ? 'none' : '1px solid #e5e7eb' }}>
    <SectionHeader title={title} action={action} />
    {children}
  </div>
);

// Thẻ khung viền riêng cho từng mục ở tab "Quy tắc tính giá bán" — chỉ dùng trong tab này, không đụng PanelSection (tab Nguồn giá gốc)
const RuleCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, action, children }) => (
  <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
    <SectionHeader title={title} action={action} />
    {subtitle && <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: '-6px 0 12px 0' }}>{subtitle}</p>}
    {children}
  </div>
);

const EditIconButton: React.FC<{ onClick: () => void; active?: boolean; title?: string }> = ({ onClick, active, title }) => (
  <button type="button" onClick={onClick} className="pcp-icon-btn pcp-icon-btn--edit" style={iconBtnStyle} title={title || (active ? 'Đóng sửa' : 'Sửa')}>
    <Pencil size={13} />
  </button>
);

const DeleteIconButton: React.FC<{ onClick: () => void; marked?: boolean; title?: string }> = ({ onClick, marked, title }) => (
  <button type="button" onClick={onClick} className={`pcp-icon-btn${marked ? ' pcp-icon-btn--undo' : ''}`} style={iconBtnStyle} title={title || (marked ? 'Bỏ đánh dấu xóa' : 'Đánh dấu xóa')}>
    {marked ? <RotateCcw size={13} /> : <Trash2 size={13} />}
  </button>
);

const ValueDisplay: React.FC<{ value: number; unit?: string; dirty?: boolean }> = ({ value, unit, dirty }) => (
  <div style={{ ...valueBoxStyle, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
    <span style={{ fontWeight: 800, fontSize: '12.5px', color: dirty ? '#b45309' : '#0f172a' }}>{formatNumberVN(value)}</span>
    {unit && <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{unit}</span>}
  </div>
);

// Input tiền tệ dùng chung — tự format dấu chấm ngăn cách nghìn, hiện suffix "₫"/"VNĐ", báo lỗi inline
const MoneyField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
  dirty?: boolean;
  width?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, error, dirty, width, autoFocus }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: width || '100%' }}>
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={formatNumberVN(value)}
        onChange={(e) => onChange(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
        style={{ ...inputStyle, paddingRight: '34px', borderColor: error ? '#dc2626' : dirty ? '#f59e0b' : '#cbd5e1' }}
      />
      <span style={suffixStyle}>VNĐ</span>
    </div>
    {error && <span style={fieldErrorStyle}>{error}</span>}
  </div>
);

// Input phần trăm dùng chung — hiện suffix "%", báo lỗi inline
const PercentField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
  width?: string;
  step?: string;
}> = ({ value, onChange, error, width, step }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: width || '100%' }}>
    <div style={{ position: 'relative' }}>
      <input
        type="number"
        className="pcp-num-input"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, paddingRight: '26px', borderColor: error ? '#dc2626' : '#cbd5e1' }}
      />
      <span style={suffixStyle}>%</span>
    </div>
    {error && <span style={fieldErrorStyle}>{error}</span>}
  </div>
);

export const PricingConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'SOURCE' | 'RULES'>('SOURCE');

  const [metalPrices, setMetalPrices] = useState<MetalPricesState>({ gold24kVnd: 0, silverVnd: 0, platinumVnd: 0 });
  const [initialMetalPrices, setInitialMetalPrices] = useState<MetalPricesState | null>(null);
  const [defaultVatRate, setDefaultVatRate] = useState(10);
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([2.5, 3]);
  const [editingSilverIdx, setEditingSilverIdx] = useState<number[]>([]);
  const [goldRatios, setGoldRatios] = useState<GoldRatio[]>([]);
  const [editingGoldRatioIdx, setEditingGoldRatioIdx] = useState<number[]>([]);
  const [profitMargins, setProfitMargins] = useState<ProfitMargin[]>([]);
  const [editingMarginIdx, setEditingMarginIdx] = useState<number[]>([]);
  // Snapshot dữ liệu gốc từ DB — dùng để so sánh, chỉ gửi lên BE field nào thực sự đổi
  const [initialConfig, setInitialConfig] = useState<ConfigSnapshot | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [initialCategories, setInitialCategories] = useState<CategoryItem[]>([]);
  const [editingCategoryIds, setEditingCategoryIds] = useState<string[]>([]);
  const [pendingDeleteCategoryIds, setPendingDeleteCategoryIds] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [newCategory, setNewCategory] = useState<{ name: string; laborCost: string }>({ name: '', laborCost: '' });

  const [stones, setStones] = useState<StoneItem[]>([]);
  const [initialStones, setInitialStones] = useState<StoneItem[]>([]);
  const [editingStoneIds, setEditingStoneIds] = useState<string[]>([]);
  const [pendingDeleteStoneIds, setPendingDeleteStoneIds] = useState<string[]>([]);
  const [stoneError, setStoneError] = useState<string | null>(null);
  const [addingStoneType, setAddingStoneType] = useState<'MAIN' | 'SIDE' | null>(null);
  const [mainPage, setMainPage] = useState(1);
  const [sidePage, setSidePage] = useState(1);
  const [newStone, setNewStone] = useState<{ stoneType: 'MAIN' | 'SIDE'; name: string; cut: string; size: string; price: string }>({
    stoneType: 'MAIN', name: '', cut: '', size: '', price: '',
  });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([fetchPricingConfig(), fetchStones(), fetchMasterData(), fetchMetalPrices()])
      .then(([config, stoneRows, master, metals]) => {
        const metalSnapshot: MetalPricesState = {
          gold24kVnd: metals?.gold24kVnd || 0,
          silverVnd: metals?.silverVnd || 0,
          platinumVnd: metals?.platinumVnd || 0,
        };
        setMetalPrices(metalSnapshot);
        setInitialMetalPrices(metalSnapshot);
        const vat = config.defaultVatRate || 0;
        const multipliers = Array.isArray(config.silverMultipliers) && config.silverMultipliers.length > 0 ? config.silverMultipliers : [2.5, 3];
        const ratios = Array.isArray(config.goldRatios) ? config.goldRatios : [];
        const margins = Array.isArray(config.profitMargins) ? config.profitMargins : [];
        setDefaultVatRate(vat);
        setSilverMultipliers(multipliers);
        setGoldRatios(ratios);
        setProfitMargins(margins);
        setInitialConfig({ defaultVatRate: vat, silverMultipliers: multipliers, goldRatios: ratios, profitMargins: margins });
        const loadedStones = Array.isArray(stoneRows) ? stoneRows : [];
        setStones(loadedStones);
        setInitialStones(loadedStones);
        setPendingDeleteStoneIds([]);
        const cats = Array.isArray(master?.categories) ? master.categories : [];
        setCategories(cats);
        setInitialCategories(cats);
      })
      .catch((err) => setError(err.message || 'Không thể tải cấu hình giá'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const changedCategories = categories.filter((c) => {
    if (pendingDeleteCategoryIds.includes(c.id)) return false;
    const original = initialCategories.find((o) => o.id === c.id);
    return original && (c.laborCost || 0) !== (original.laborCost || 0);
  });

  const changedStonePrices = stones.filter((s) => {
    if (pendingDeleteStoneIds.includes(s.id)) return false;
    const original = initialStones.find((o) => o.id === s.id);
    return original && original.price !== s.price;
  });

  const goldPriceDirty = initialMetalPrices ? metalPrices.gold24kVnd !== initialMetalPrices.gold24kVnd : false;
  const silverPriceDirty = initialMetalPrices ? metalPrices.silverVnd !== initialMetalPrices.silverVnd : false;
  const platinumPriceDirty = initialMetalPrices ? metalPrices.platinumVnd !== initialMetalPrices.platinumVnd : false;
  const metalPricesDirty = goldPriceDirty || silverPriceDirty || platinumPriceDirty;

  const vatDirty = initialConfig ? defaultVatRate !== initialConfig.defaultVatRate : false;
  const silverDirty = initialConfig ? JSON.stringify(silverMultipliers) !== JSON.stringify(initialConfig.silverMultipliers) : false;
  const goldRatiosDirty = initialConfig ? JSON.stringify(goldRatios) !== JSON.stringify(initialConfig.goldRatios) : false;
  const profitMarginsDirty = initialConfig ? JSON.stringify(profitMargins) !== JSON.stringify(initialConfig.profitMargins) : false;
  const categoriesDirty = changedCategories.length > 0 || pendingDeleteCategoryIds.length > 0;
  const stonesDirty = changedStonePrices.length > 0 || pendingDeleteStoneIds.length > 0;

  const hasPendingChanges = metalPricesDirty || vatDirty || silverDirty || goldRatiosDirty || profitMarginsDirty || categoriesDirty || stonesDirty;

  // Validation: số âm ở bất kỳ đâu, hoặc % vượt quá 100 — chặn nút Lưu
  const vatError = defaultVatRate < 0 ? 'Không được âm' : defaultVatRate > 100 ? 'Tối đa 100%' : null;
  const marginPctError = (pct: number) => (pct < 0 ? 'Không được âm' : pct > 100 ? 'Tối đa 100%' : null);
  const hasValidationError =
    !!vatError ||
    silverMultipliers.some((v) => v < 0) ||
    goldRatios.some((r) => r.applied < 0) ||
    profitMargins.some((m) => !!marginPctError(parseFloat(m.margin) || 0));

  // 1 API call gộp cho từng loại field/thực thể nào thực sự thay đổi so với dữ liệu gốc đã tải
  const handleSaveConfig = async () => {
    if (!initialConfig) return;
    const payload: Partial<ConfigSnapshot> = {};
    if (vatDirty) payload.defaultVatRate = defaultVatRate;
    if (silverDirty) payload.silverMultipliers = silverMultipliers;
    if (goldRatiosDirty) payload.goldRatios = goldRatios;
    if (profitMarginsDirty) payload.profitMargins = profitMargins;

    const metalPayload: { gold24kVnd?: number; silverVnd?: number; platinumVnd?: number } = {};
    if (goldPriceDirty) metalPayload.gold24kVnd = metalPrices.gold24kVnd;
    if (silverPriceDirty) metalPayload.silverVnd = metalPrices.silverVnd;
    if (platinumPriceDirty) metalPayload.platinumVnd = metalPrices.platinumVnd;

    if (!hasPendingChanges) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        Object.keys(payload).length > 0 ? updatePricingConfig(payload) : Promise.resolve(),
        metalPricesDirty ? updateMetalPrices(metalPayload) : Promise.resolve(),
        categoriesDirty
          ? updateProductCategoryLaborCosts(changedCategories.map((c) => ({ id: c.id, laborCost: c.laborCost || 0 })))
          : Promise.resolve(),
        changedStonePrices.length > 0
          ? updateStonePrices(changedStonePrices.map((s) => ({ id: s.id, price: s.price })))
          : Promise.resolve(),
        pendingDeleteStoneIds.length > 0 ? deleteStonesMany(pendingDeleteStoneIds) : Promise.resolve(),
        pendingDeleteCategoryIds.length > 0 ? deleteProductCategoriesMany(pendingDeleteCategoryIds) : Promise.resolve(),
      ]);

      setInitialMetalPrices(metalPrices);
      setInitialConfig({ defaultVatRate, silverMultipliers, goldRatios, profitMargins });
      const remainingCategories = categories.filter((c) => !pendingDeleteCategoryIds.includes(c.id));
      setCategories(remainingCategories);
      setInitialCategories(remainingCategories);
      setPendingDeleteCategoryIds([]);
      const remainingStones = stones.filter((s) => !pendingDeleteStoneIds.includes(s.id));
      setStones(remainingStones);
      setInitialStones(remainingStones);
      setPendingDeleteStoneIds([]);
      setEditingSilverIdx([]);
      setEditingGoldRatioIdx([]);
      setEditingMarginIdx([]);
      setEditingCategoryIds([]);
      setEditingStoneIds([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      showToast('success', 'Đã lưu cấu hình thành công');
    } catch (err: any) {
      const message = err.message || 'Lưu cấu hình thất bại';
      setError(message);
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Hủy bỏ toàn bộ thay đổi chưa lưu — về lại đúng dữ liệu gốc đã tải, đóng mọi ô đang sửa/đang thêm
  const handleCancelAll = () => {
    if (initialMetalPrices) setMetalPrices(initialMetalPrices);
    if (initialConfig) {
      setDefaultVatRate(initialConfig.defaultVatRate);
      setSilverMultipliers(initialConfig.silverMultipliers);
      setGoldRatios(initialConfig.goldRatios);
      setProfitMargins(initialConfig.profitMargins);
    }
    setCategories(initialCategories);
    setPendingDeleteCategoryIds([]);
    setStones(initialStones);
    setPendingDeleteStoneIds([]);
    setEditingSilverIdx([]);
    setEditingGoldRatioIdx([]);
    setEditingMarginIdx([]);
    setEditingCategoryIds([]);
    setEditingStoneIds([]);
    setAddingCategory(false);
    setAddingStoneType(null);
  };

  // Chỉ cập nhật local state — lưu xuống BE khi bấm nút "Lưu cấu hình" ở dưới
  const updateMetalPrice = (field: keyof MetalPricesState, val: number) => {
    setMetalPrices((prev) => ({ ...prev, [field]: val }));
  };

  const updateSilverMultiplier = (idx: number, val: number) => {
    setSilverMultipliers((prev) => prev.map((v, i) => (i === idx ? val : v)));
  };

  const removeSilverMultiplier = (idx: number) => {
    setSilverMultipliers((prev) => prev.filter((_, i) => i !== idx));
    setEditingSilverIdx((prev) => prev.filter((i) => i !== idx));
  };

  const addSilverMultiplier = () => {
    setSilverMultipliers((prev) => {
      const next = [...prev, 3];
      setEditingSilverIdx((idxPrev) => [...idxPrev, next.length - 1]);
      return next;
    });
  };

  // Chỉ cập nhật local state — lưu xuống BE khi bấm nút "Lưu cấu hình" ở dưới
  const handleCategoryLaborCostChange = (id: string, laborCost: number) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, laborCost } : c)));
  };

  // Đánh dấu xóa (hoặc bỏ đánh dấu) — chưa xóa thật, chỉ xóa thật khi bấm "Lưu cấu hình"
  const handleToggleDeleteCategory = (id: string) => {
    setPendingDeleteCategoryIds((prev) => toggleInArray(prev, id));
  };

  // Thêm danh mục lưu ngay (giống thêm đá) — không staged
  const handleAddCategory = async () => {
    setError(null);
    if (!newCategory.name.trim()) {
      setError('Vui lòng nhập tên danh mục sản phẩm');
      return;
    }
    try {
      const laborCost = parseFloat(newCategory.laborCost.replace(/\D/g, '')) || 0;
      const created = await createProductCategory(newCategory.name.trim(), laborCost);
      setCategories((prev) => [...prev, created]);
      setInitialCategories((prev) => [...prev, created]);
      setNewCategory({ name: '', laborCost: '' });
      setAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Không thể thêm danh mục sản phẩm');
    }
  };

  const updateGoldRatio = (idx: number, patch: Partial<GoldRatio>) => {
    setGoldRatios((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  // Thêm bậc tuổi vàng mới — local-only, mở sẵn edit mode để nhập tên/tỷ lệ, gửi xuống BE gộp lúc bấm "Lưu cấu hình"
  const addGoldRatio = () => {
    setGoldRatios((prev) => {
      const next = [...prev, { key: `new-${Date.now()}`, standard: 0, applied: 0, label: '' }];
      setEditingGoldRatioIdx((idxPrev) => [...idxPrev, next.length - 1]);
      return next;
    });
  };

  const removeGoldRatio = (idx: number) => {
    setGoldRatios((prev) => prev.filter((_, i) => i !== idx));
    setEditingGoldRatioIdx((prev) => prev.filter((i) => i !== idx));
  };

  const updateMargin = (idx: number, patch: Partial<ProfitMargin>) => {
    setProfitMargins((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const removeMargin = (idx: number) => {
    setProfitMargins((prev) => prev.filter((_, i) => i !== idx));
    setEditingMarginIdx((prev) => prev.filter((i) => i !== idx));
  };

  const addMargin = () => {
    setProfitMargins((prev) => {
      const next = [...prev, { maxCost: 0, divisor: 0.8, margin: '' }];
      setEditingMarginIdx((idxPrev) => [...idxPrev, next.length - 1]);
      return next;
    });
  };

  const handleAddStone = async () => {
    setStoneError(null);
    const price = parseFloat(newStone.price.replace(/\D/g, '')) || 0;
    if (!newStone.name.trim() || price <= 0) {
      setStoneError('Vui lòng nhập tên đá và giá hợp lệ');
      return;
    }
    try {
      const created = await createStone({ stoneType: newStone.stoneType, name: newStone.name.trim(), cut: newStone.cut.trim() || undefined, size: newStone.size.trim() || undefined, price });
      setStones((prev) => [...prev, created]);
      setInitialStones((prev) => [...prev, created]);
      setNewStone({ stoneType: newStone.stoneType, name: '', cut: '', size: '', price: '' });
      setAddingStoneType(null);
    } catch (err: any) {
      setStoneError(err.message || 'Không thể thêm đá');
    }
  };

  const openAddStone = (stoneType: 'MAIN' | 'SIDE') => {
    setNewStone({ stoneType, name: '', cut: '', size: '', price: '' });
    setStoneError(null);
    setAddingStoneType(stoneType);
  };

  // Chỉ cập nhật local state — lưu xuống BE khi bấm "Lưu cấu hình" ở dưới
  const handleUpdateStonePrice = (id: string, price: number) => {
    setStones((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
  };

  // Đánh dấu xóa (hoặc bỏ đánh dấu) — chưa xóa thật, chỉ xóa thật khi bấm "Lưu cấu hình"
  const handleToggleDeleteStone = (id: string) => {
    setPendingDeleteStoneIds((prev) => toggleInArray(prev, id));
  };

  // Import file Excel (.xlsx/.xls) — BE verify toàn bộ file, chỉ 1 dòng lỗi cũng chặn cả file
  const handleImportFile = async (file: File) => {
    setImportResult(null);
    setStoneError(null);
    setImporting(true);
    try {
      const result = await importStonesExcel(file);
      setImportResult(`Đã import ${result.imported} đá`);
      const rowsFresh = await fetchStones();
      const freshList = Array.isArray(rowsFresh) ? rowsFresh : [];
      setStones(freshList);
      setInitialStones(freshList);
    } catch (err: any) {
      setStoneError(err.message || 'Import thất bại');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '30px', color: '#64748b', fontSize: '13px' }}>Đang tải cấu hình...</div>;
  }

  const mainStones = stones.filter((s) => s.stoneType === 'MAIN');
  const sideStones = stones.filter((s) => s.stoneType === 'SIDE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pcp-spin { to { transform: rotate(360deg); } }
        .pcp-spin { animation: pcp-spin 0.8s linear infinite; }
        .pcp-icon-btn { color: #9ca3af; transition: color 0.15s ease; }
        .pcp-icon-btn:hover { color: #dc2626; }
        .pcp-icon-btn--edit:hover { color: ${PRIMARY_BLUE}; }
        .pcp-icon-btn.pcp-icon-btn--undo:hover { color: #334155; }
        .pcp-num-input::-webkit-inner-spin-button,
        .pcp-num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .pcp-num-input { -moz-appearance: textfield; }
        .pcp-tab { padding: 10px 4px; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 700; cursor: pointer; color: #94a3b8; background: transparent; }
        .pcp-tab:hover { color: #475569; }
        .pcp-tab--active { color: #0f172a; border-bottom-color: #0f172a; }
        .pcp-add-row { background: #f8fafc; border-top: 1px dashed #cbd5e1; }
        .pcp-add-trigger { color: #64748b; }
        .pcp-add-trigger:hover { color: ${PRIMARY_BLUE}; }
        @media (max-width: 760px) { .pcp-rules-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#b91c1c', fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px', marginBottom: '14px' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Panel duy nhất — header + tabs + nội dung + footer sticky, giống mockup */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px' }}>
        <div style={{ padding: '22px 22px 0' }}>
          <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Cấu hình giá</h1>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>Quản lý nguồn giá gốc và quy tắc tính giá bán cho hệ thống kho.</p>

          <div style={{ display: 'flex', gap: '22px', marginTop: '18px', borderBottom: '1px solid #e5e7eb' }}>
            <button type="button" className={`pcp-tab${activeTab === 'SOURCE' ? ' pcp-tab--active' : ''}`} onClick={() => setActiveTab('SOURCE')}>
              Nguồn giá gốc (Giá vốn)
            </button>
            <button type="button" className={`pcp-tab${activeTab === 'RULES' ? ' pcp-tab--active' : ''}`} onClick={() => setActiveTab('RULES')}>
              Quy tắc tính giá bán
            </button>
          </div>
        </div>

        <div style={{ padding: '0 22px' }}>
          {activeTab === 'SOURCE' && (
            <>
              {/* Giá kim loại quý — luôn mở sẵn để sửa, không cần bấm bút chì */}
              <PanelSection first title="Giá kim loại quý (VNĐ/chỉ)">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Vàng 24K</label>
                    <MoneyField value={metalPrices.gold24kVnd} onChange={(v) => updateMetalPrice('gold24kVnd', v)} dirty={goldPriceDirty} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bạc</label>
                    <MoneyField value={metalPrices.silverVnd} onChange={(v) => updateMetalPrice('silverVnd', v)} dirty={silverPriceDirty} />
                  </div>
                  <div>
                    <label style={labelStyle}>Bạch kim</label>
                    <MoneyField value={metalPrices.platinumVnd} onChange={(v) => updateMetalPrice('platinumVnd', v)} dirty={platinumPriceDirty} />
                  </div>
                </div>
              </PanelSection>

              {/* Bảng tỷ lệ vàng theo tuổi */}
              <PanelSection
                title="Bảng tỷ lệ vàng theo tuổi"
                action={<button type="button" onClick={addGoldRatio} style={btnGhostSmallStyle}><Plus size={12} /> Thêm tỷ lệ</button>}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={tableHeadRowStyle}>
                        <th style={{ ...thStyle, width: '45%' }}>Tên loại vàng</th>
                        <th style={{ ...thStyle, width: '35%' }}>Tỷ lệ áp dụng</th>
                        <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goldRatios.map((r, idx) => {
                        const original = initialConfig?.goldRatios[idx];
                        const rowDirty = !original || JSON.stringify(original) !== JSON.stringify(r);
                        const isEditing = editingGoldRatioIdx.includes(idx);
                        const ratioError = r.applied < 0 ? 'Không được âm' : null;
                        return (
                          <tr key={r.key || idx} style={{ borderBottom: '1px solid #f1f5f9', background: rowDirty ? '#fffbeb' : undefined }}>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <input value={r.label} onChange={(e) => updateGoldRatio(idx, { label: e.target.value })} style={inputStyle} placeholder="VD: 10K" />
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a' }}>{r.label || '—'}</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <input type="number" className="pcp-num-input" step="0.001" value={r.applied} onChange={(e) => updateGoldRatio(idx, { applied: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, borderColor: ratioError ? '#dc2626' : '#cbd5e1' }} />
                                  {ratioError && <span style={fieldErrorStyle}>{ratioError}</span>}
                                </div>
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 700, color: '#334155' }}>{r.applied}</span>
                              )}
                            </td>
                            <td style={tdCenterStyle}>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <EditIconButton onClick={() => setEditingGoldRatioIdx((prev) => toggleInArray(prev, idx))} active={isEditing} />
                                <DeleteIconButton onClick={() => removeGoldRatio(idx)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {goldRatios.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có tỷ lệ nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </PanelSection>

              {/* Quản lý bảng giá đá */}
              <PanelSection
                title="Quản lý bảng giá đá"
                action={
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f) {
                          if (!/\.(xlsx|xls)$/i.test(f.name)) {
                            setStoneError('Chỉ chấp nhận file Excel (.xlsx hoặc .xls)');
                          } else {
                            handleImportFile(f);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ ...btnGhostSmallStyle, opacity: importing ? 0.6 : 1 }}>
                      {importing ? <Loader2 size={12} className="pcp-spin" /> : <Upload size={12} />} Import Excel
                    </button>
                  </>
                }
              >
                {stoneError && (
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#b91c1c', fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px', whiteSpace: 'pre-line', maxHeight: '160px', overflowY: 'auto' }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{stoneError}</span>
                  </div>
                )}
                {importResult && <div style={{ marginBottom: '12px', color: '#16a34a', fontSize: '12px', fontWeight: 700 }}>{importResult}</div>}

                <StoneGroupTable
                  title="Đá Chủ"
                  addLabel="Thêm đá chủ"
                  stoneType="MAIN"
                  items={mainStones}
                  initialStones={initialStones}
                  pendingDeleteIds={pendingDeleteStoneIds}
                  editingIds={editingStoneIds}
                  page={mainPage}
                  setPage={setMainPage}
                  onPriceChange={handleUpdateStonePrice}
                  onToggleDelete={handleToggleDeleteStone}
                  onToggleEdit={(id) => setEditingStoneIds((prev) => toggleInArray(prev, id))}
                  adding={addingStoneType === 'MAIN'}
                  onOpenAdd={() => openAddStone('MAIN')}
                  onCloseAdd={() => setAddingStoneType(null)}
                  newStone={newStone}
                  setNewStone={setNewStone}
                  onConfirmAdd={handleAddStone}
                />

                <div style={{ height: '22px' }} />

                <StoneGroupTable
                  title="Đá Tấm"
                  addLabel="Thêm đá tấm"
                  stoneType="SIDE"
                  items={sideStones}
                  initialStones={initialStones}
                  pendingDeleteIds={pendingDeleteStoneIds}
                  editingIds={editingStoneIds}
                  page={sidePage}
                  setPage={setSidePage}
                  onPriceChange={handleUpdateStonePrice}
                  onToggleDelete={handleToggleDeleteStone}
                  onToggleEdit={(id) => setEditingStoneIds((prev) => toggleInArray(prev, id))}
                  adding={addingStoneType === 'SIDE'}
                  onOpenAdd={() => openAddStone('SIDE')}
                  onCloseAdd={() => setAddingStoneType(null)}
                  newStone={newStone}
                  setNewStone={setNewStone}
                  onConfirmAdd={handleAddStone}
                />
              </PanelSection>
            </>
          )}

          {activeTab === 'RULES' && (
            <div className="pcp-rules-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px', alignItems: 'start', padding: '22px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Cấu hình VAT — icon vuông chỉ mang tính trang trí, ô giá trị luôn mở sẵn để nhập */}
              <RuleCard
                title="Cấu hình VAT"
                subtitle="Thuế giá trị gia tăng mặc định áp dụng cho tất cả sản phẩm."
                action={
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                    <FileText size={16} />
                  </div>
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', maxWidth: '320px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>VAT mặc định (%)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <input
                      type="number"
                      className="pcp-num-input"
                      value={defaultVatRate}
                      onChange={(e) => setDefaultVatRate(parseFloat(e.target.value) || 0)}
                      style={{ width: '90px', border: 'none', outline: 'none', textAlign: 'right', fontSize: '15px', fontWeight: 800, color: vatDirty ? '#b45309' : '#0f172a', background: 'transparent', borderBottom: `1px solid ${vatError ? '#dc2626' : vatDirty ? '#f59e0b' : '#e5e7eb'}` }}
                    />
                    {vatError && <span style={fieldErrorStyle}>{vatError}</span>}
                  </div>
                </div>
              </RuleCard>

              {/* Hệ số nhân Bạc */}
              <RuleCard
                title="Hệ số nhân Bạc"
                subtitle="Các mức hệ số nhân dùng để tính giá bán cho trang sức Bạc."
                action={<button type="button" onClick={addSilverMultiplier} style={btnGhostSmallStyle}><Plus size={12} /> Thêm hệ số</button>}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={tableHeadRowStyle}>
                        <th style={{ ...thStyle, width: '60px' }}>STT</th>
                        <th style={thStyle}>Hệ số nhân</th>
                        <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {silverMultipliers.map((mult, idx) => {
                        const multError = mult < 0 ? 'Không được âm' : null;
                        const isEditing = editingSilverIdx.includes(idx);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ ...tdStyle, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <input type="number" className="pcp-num-input" step="0.1" value={mult} onChange={(e) => updateSilverMultiplier(idx, parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: '100px', borderColor: multError ? '#dc2626' : '#cbd5e1' }} />
                                  {multError && <span style={fieldErrorStyle}>{multError}</span>}
                                </div>
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a' }}>{mult}</span>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <EditIconButton onClick={() => setEditingSilverIdx((prev) => toggleInArray(prev, idx))} active={isEditing} />
                                <DeleteIconButton onClick={() => removeSilverMultiplier(idx)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {silverMultipliers.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có hệ số nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </RuleCard>

              {/* Bảng lợi nhuận */}
              <RuleCard
                title="Bảng lợi nhuận (Margin)"
                subtitle="Biên độ lợi nhuận áp dụng theo từng mốc chi phí sản xuất."
                action={<button type="button" onClick={addMargin} style={btnGhostSmallStyle}><Plus size={12} /> Thêm bậc</button>}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={tableHeadRowStyle}>
                        <th style={{ ...thStyle, width: '42%' }}>Chi phí tối đa (VNĐ)</th>
                        <th style={{ ...thStyle, width: '38%' }}>Biên độ lợi nhuận (%)</th>
                        <th style={{ ...thStyle, width: '90px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitMargins.map((m, idx) => {
                        const original = initialConfig?.profitMargins[idx];
                        const rowDirty = !original || JSON.stringify(original) !== JSON.stringify(m);
                        const marginPct = parseFloat(m.margin) || 0;
                        const pctError = marginPctError(marginPct);
                        const isUnlimited = m.maxCost >= UNLIMITED_MAX_COST;
                        const isEditing = editingMarginIdx.includes(idx);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: rowDirty ? '#fffbeb' : undefined }}>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6b7280', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    <input type="checkbox" checked={isUnlimited} onChange={(e) => updateMargin(idx, { maxCost: e.target.checked ? UNLIMITED_MAX_COST : 0 })} />
                                    Không giới hạn
                                  </label>
                                  {!isUnlimited && <MoneyField value={m.maxCost} onChange={(v) => updateMargin(idx, { maxCost: v })} />}
                                </div>
                              ) : (
                                isUnlimited ? <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>Không giới hạn</span> : <ValueDisplay value={m.maxCost} unit="VNĐ" />
                              )}
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <PercentField value={marginPct} onChange={(pct) => updateMargin(idx, { margin: `${pct}%`, divisor: (100 - pct) / 100 })} error={pctError} width="140px" />
                              ) : (
                                <ValueDisplay value={marginPct} unit="%" />
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <EditIconButton onClick={() => setEditingMarginIdx((prev) => toggleInArray(prev, idx))} active={isEditing} />
                                <DeleteIconButton onClick={() => removeMargin(idx)} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {profitMargins.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có bậc lợi nhuận nào</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </RuleCard>
            </div>

            {/* Tiền công theo danh mục sản phẩm — panel riêng bên phải, gọn, giống ảnh mockup */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={15} style={{ color: '#64748b', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Tiền công</h3>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Theo danh mục sản phẩm</p>
                  </div>
                </div>
                <button type="button" onClick={() => setAddingCategory(true)} style={iconBtnStyle} className="pcp-icon-btn pcp-icon-btn--edit" title="Thêm danh mục">
                  <Plus size={16} />
                </button>
              </div>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(categories.length / CATEGORY_PAGE_SIZE));
                const safePage = Math.min(categoryPage, totalPages);
                const pageItems = categories.slice((safePage - 1) * CATEGORY_PAGE_SIZE, safePage * CATEGORY_PAGE_SIZE);
                return (
                  <>
                    <CategoryTable
                      items={pageItems}
                      initialCategories={initialCategories}
                      pendingDeleteIds={pendingDeleteCategoryIds}
                      editingIds={editingCategoryIds}
                      onLaborCostChange={handleCategoryLaborCostChange}
                      onToggleDelete={handleToggleDeleteCategory}
                      onToggleEdit={(id) => setEditingCategoryIds((prev) => toggleInArray(prev, id))}
                      adding={addingCategory}
                      onCloseAdd={() => setAddingCategory(false)}
                      newCategory={newCategory}
                      setNewCategory={setNewCategory}
                      onConfirmAdd={handleAddCategory}
                    />
                    {categories.length === 0 && !addingCategory && (
                      <div style={{ padding: '10px 0', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Chưa có danh mục sản phẩm nào</div>
                    )}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" onClick={() => setCategoryPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} style={pageBtnStyle(safePage <= 1)}>‹</button>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{safePage}/{totalPages}</span>
                        <button type="button" onClick={() => setCategoryPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} style={pageBtnStyle(safePage >= totalPages)}>›</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            </div>
          )}
        </div>

        {/* Footer sticky — Hủy bỏ + Lưu cấu hình, luôn nổi khi cuộn trang */}
        <div style={{ position: 'sticky', bottom: '-20px', margin: '0 -20px -20px', padding: '14px 22px', background: '#ffffff', borderTop: '1px solid #e5e7eb', borderRadius: '0 0 16px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={handleCancelAll} style={btnSecondaryStyle}>
            <RotateCcw size={13} /> Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving || !hasPendingChanges || hasValidationError}
            title={hasValidationError ? 'Còn field lỗi, sửa trước khi lưu' : undefined}
            style={{
              ...btnPrimaryStyle,
              background: saved ? '#16a34a' : PRIMARY_DARK,
              cursor: (saving || !hasPendingChanges || hasValidationError) ? 'default' : 'pointer',
              opacity: (!saving && (!hasPendingChanges || hasValidationError)) ? 0.5 : 1,
            }}
          >
            {saving ? <Loader2 size={13} className="pcp-spin" /> : <Save size={13} />}
            {saved ? 'Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      {/* Toast thông báo lưu thành công/lỗi */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: '20px', right: '20px', zIndex: 50,
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)', background: toast.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#ffffff', fontSize: '12.5px', fontWeight: 700, maxWidth: '360px',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// ==========================
// Bảng danh mục sản phẩm — 1 bảng dọc + hàng "thêm mới" dạng dashed gắn liền
// ==========================

const CategoryTable: React.FC<{
  items: CategoryItem[];
  initialCategories: CategoryItem[];
  pendingDeleteIds: string[];
  editingIds: string[];
  onLaborCostChange: (id: string, laborCost: number) => void;
  onToggleDelete: (id: string) => void;
  onToggleEdit: (id: string) => void;
  adding: boolean;
  onCloseAdd: () => void;
  newCategory: { name: string; laborCost: string };
  setNewCategory: React.Dispatch<React.SetStateAction<{ name: string; laborCost: string }>>;
  onConfirmAdd: () => void;
}> = ({ items, initialCategories, pendingDeleteIds, editingIds, onLaborCostChange, onToggleDelete, onToggleEdit, adding, onCloseAdd, newCategory, setNewCategory, onConfirmAdd }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((c) => {
        const original = initialCategories.find((o) => o.id === c.id);
        const markedDelete = pendingDeleteIds.includes(c.id);
        const isDirty = !markedDelete && !!original && (original.laborCost || 0) !== (c.laborCost || 0);
        const isEditing = editingIds.includes(c.id);
        return (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '9px 0', minHeight: '38px', borderBottom: '1px solid #f1f5f9', background: markedDelete ? '#fef2f2' : isDirty ? '#fffbeb' : undefined }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: markedDelete ? '#94a3b8' : '#334155', textDecoration: markedDelete ? 'line-through' : 'none' }}>{c.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {isEditing && !markedDelete ? (
                <MoneyField value={c.laborCost || 0} onChange={(v) => onLaborCostChange(c.id, v)} width="120px" />
              ) : (
                <span style={{ ...valueBoxStyle, width: '120px', fontSize: '12.5px', fontWeight: 800, color: isDirty ? '#b45309' : '#0f172a' }}>{formatNumberVN(c.laborCost || 0)}</span>
              )}
              <EditIconButton onClick={() => onToggleEdit(c.id)} active={isEditing} title={markedDelete ? undefined : (isEditing ? 'Đóng sửa' : 'Sửa')} />
              <DeleteIconButton onClick={() => onToggleDelete(c.id)} marked={markedDelete} />
            </div>
          </div>
        );
      })}
      {items.length === 0 && !adding && (
        <div style={{ padding: '10px 0', textAlign: 'center', color: '#cbd5e1', fontSize: '12px' }}>—</div>
      )}
      {adding && (
        <div className="pcp-add-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '8px', marginTop: '8px' }}>
          <input autoFocus value={newCategory.name} onChange={(e) => setNewCategory((s) => ({ ...s, name: e.target.value }))} style={inputStyle} placeholder="Tên danh mục" />
          <MoneyField value={parseFloat(newCategory.laborCost) || 0} onChange={(v) => setNewCategory((s) => ({ ...s, laborCost: String(v) }))} />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onConfirmAdd} style={iconBtnStyle} className="pcp-icon-btn pcp-icon-btn--edit" title="Xác nhận thêm">
              <Check size={14} />
            </button>
            <button type="button" onClick={onCloseAdd} style={iconBtnStyle} className="pcp-icon-btn" title="Hủy">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================
// Bảng đá theo loại (Đá Chủ / Đá Tấm) — luôn hiển thị đồng thời, không còn tab chuyển đổi
// ==========================

const StoneGroupTable: React.FC<{
  title: string;
  addLabel: string;
  stoneType: 'MAIN' | 'SIDE';
  items: StoneItem[];
  initialStones: StoneItem[];
  pendingDeleteIds: string[];
  editingIds: string[];
  page: number;
  setPage: (p: number) => void;
  onPriceChange: (id: string, price: number) => void;
  onToggleDelete: (id: string) => void;
  onToggleEdit: (id: string) => void;
  adding: boolean;
  onOpenAdd: () => void;
  onCloseAdd: () => void;
  newStone: { stoneType: 'MAIN' | 'SIDE'; name: string; cut: string; size: string; price: string };
  setNewStone: React.Dispatch<React.SetStateAction<{ stoneType: 'MAIN' | 'SIDE'; name: string; cut: string; size: string; price: string }>>;
  onConfirmAdd: () => void;
}> = ({ title, addLabel, items, initialStones, pendingDeleteIds, editingIds, page, setPage, onPriceChange, onToggleDelete, onToggleEdit, adding, onOpenAdd, onCloseAdd, newStone, setNewStone, onConfirmAdd }) => {
  const totalPages = Math.max(1, Math.ceil(items.length / STONE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * STONE_PAGE_SIZE, safePage * STONE_PAGE_SIZE);

  return (
    <div>
      <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#334155', margin: '0 0 8px 0' }}>{title}</h4>
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '10px' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr style={tableHeadRowStyle}>
              <th style={{ ...thStyle, width: '26%' }}>Tên đá</th>
              <th style={{ ...thStyle, width: '18%' }}>Giác cắt</th>
              <th style={{ ...thStyle, width: '15%' }}>Size (mm)</th>
              <th style={{ ...thStyle, width: '26%' }}>Giá (VNĐ)</th>
              <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => {
              const original = initialStones.find((o) => o.id === s.id);
              const markedDelete = pendingDeleteIds.includes(s.id);
              const isDirty = !markedDelete && !!original && original.price !== s.price;
              const isEditing = editingIds.includes(s.id);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: markedDelete ? '#fef2f2' : isDirty ? '#fffbeb' : undefined }}>
                  <td style={{ ...tdStyle, fontWeight: 800, textDecoration: markedDelete ? 'line-through' : 'none', color: markedDelete ? '#94a3b8' : '#0f172a' }}>{s.name}</td>
                  <td style={{ ...tdStyle, color: markedDelete ? '#94a3b8' : undefined }}>{s.cut || '—'}</td>
                  <td style={{ ...tdStyle, color: markedDelete ? '#94a3b8' : undefined }}>{s.size || '—'}</td>
                  <td style={tdStyle}>
                    {isEditing && !markedDelete ? (
                      <MoneyField value={s.price} onChange={(v) => onPriceChange(s.id, v)} width="160px" />
                    ) : (
                      <ValueDisplay value={s.price} dirty={isDirty} />
                    )}
                  </td>
                  <td style={tdCenterStyle}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                      <EditIconButton onClick={() => onToggleEdit(s.id)} active={isEditing} />
                      <DeleteIconButton onClick={() => onToggleDelete(s.id)} marked={markedDelete} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !adding && (
              <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có đá nào</td></tr>
            )}
            {adding && (
              <tr className="pcp-add-row">
                <td style={tdStyle}><input autoFocus value={newStone.name} onChange={(e) => setNewStone((s) => ({ ...s, name: e.target.value }))} style={inputStyle} placeholder="Tên đá" /></td>
                <td style={tdStyle}><input value={newStone.cut} onChange={(e) => setNewStone((s) => ({ ...s, cut: e.target.value }))} style={inputStyle} placeholder="Giác cắt" /></td>
                <td style={tdStyle}><input value={newStone.size} onChange={(e) => setNewStone((s) => ({ ...s, size: e.target.value }))} style={inputStyle} placeholder="Size" /></td>
                <td style={tdStyle}><MoneyField value={parseFloat(newStone.price) || 0} onChange={(v) => setNewStone((s) => ({ ...s, price: String(v) }))} width="160px" /></td>
                <td style={tdCenterStyle}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button type="button" onClick={onConfirmAdd} style={iconBtnStyle} className="pcp-icon-btn pcp-icon-btn--edit" title="Xác nhận thêm">
                      <Check size={14} />
                    </button>
                    <button type="button" onClick={onCloseAdd} style={iconBtnStyle} className="pcp-icon-btn" title="Hủy">
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          {!adding && (
            <tfoot>
              <tr className="pcp-add-row">
                <td colSpan={5} style={{ padding: '8px' }}>
                  <button type="button" onClick={onOpenAdd} className="pcp-add-trigger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '4px' }}>
                    <Plus size={13} /> {addLabel}
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {items.length > STONE_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} style={pageBtnStyle(safePage <= 1)}>‹</button>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>Trang {safePage}/{totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} style={pageBtnStyle(safePage >= totalPages)}>›</button>
        </div>
      )}
    </div>
  );
};
