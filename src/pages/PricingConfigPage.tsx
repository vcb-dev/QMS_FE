import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Pencil, Check, X, Upload, AlertTriangle, RotateCcw, Loader2, CheckCircle2, XCircle, Wrench, Coins, Layers, Gem, PlusCircle, TrendingUp, Percent, History, Settings, type LucideIcon } from 'lucide-react';
import { MetalPriceHistoryModal } from '../components/MetalPriceHistoryModal';
import {
  fetchStones,
  createStone,
  updateStonePrices,
  deleteStonesMany,
  importStonesExcel,
  fetchMasterData,
  updateProductCategoriesBulk,
  createProductCategory,
  deleteProductCategoriesMany,
  fetchBaseMetals,
  createBaseMetal,
  setBaseMetalActive,
  updateBaseMetalPrice,
  createMaterial,
  updateMaterial,
  fetchPricingFormulas,
  createPricingFormula,
  updatePricingFormula,
} from '../services/api';
import { formatNumberVN } from '../utils/currency';
import type{BaseMetal, StoneItem, CategoryItem, Material, PricingFormula, PricingFormulaType, MarginTier} from '../types';
import {UNLIMITED_MAX_COST, STONE_PAGE_SIZE, CATEGORY_PAGE_SIZE} from "../constants/index";
import {PRIMARY_BLUE,thStyle,tdStyle,tdCenterStyle,tableHeadRowStyle,labelStyle, btnPrimaryStyle, btnSecondaryStyle, btnGhostSmallStyle, iconBtnStyle,pageBtnStyle, inputStyle, valueBoxStyle, suffixStyle, fieldErrorStyle } from '../styles/card';
const toggleInArray = <T,>(arr: T[], val: T): T[] => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
// Chặn thật sự ngay lúc gõ (không chỉ báo lỗi) — kẹp giá trị về đúng khoảng 0-100% (VAT/lợi nhuận,
// công thức margin dùng (100-pct)/100 nên không được vượt 100)
const clampPercent = (v: number): number => Math.min(100, Math.max(0, v));
// % chất liệu (priceRatioPct) không bị chặn ở 100 — chất liệu có thể đắt hơn giá kim loại gốc
const clampMaterialRatio = (v: number): number => Math.min(1000, Math.max(0, v));
// Tiền VNĐ — chặn theo đúng sức chứa cột DB Decimal(14,2), tránh nhập nhầm số quá lớn gây lỗi lúc lưu
const MAX_MONEY_VND = 999_999_999_999;
const clampMoney = (v: number): number => Math.min(MAX_MONEY_VND, Math.max(0, v));

// ==========================
// Small shared components
// ==========================

const SectionHeader: React.FC<{ title: string; action?: React.ReactNode; icon?: LucideIcon }> = ({ title, action, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
      {Icon ? <Icon size={15} style={{ color: '#0f172a', flexShrink: 0 }} /> : <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a', flexShrink: 0 }} />}
      <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0, wordBreak: 'keep-all' }}>{title}</h3>
    </div>
    {action}
  </div>
);

const PanelSection: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; first?: boolean; icon?: LucideIcon }> = ({ title, action, children, first, icon }) => (
  <div style={{ padding: '22px 0', borderTop: first ? 'none' : '1px solid #e5e7eb' }}>
    <SectionHeader title={title} action={action} icon={icon} />
    {children}
  </div>
);

// Thẻ khung viền riêng cho từng mục ở tab "Quy tắc tính giá bán" — chỉ dùng trong tab này, không đụng PanelSection (tab Nguồn giá gốc)
const RuleCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; icon?: LucideIcon }> = ({ title, subtitle, action, children, icon }) => (
  <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
    <SectionHeader title={title} action={action} icon={icon} />
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

// Banner lỗi màu đỏ dùng chung — 4 chỗ trong trang này trước đây tự viết lặp lại y hệt.
const ErrorBanner: React.FC<{ message: string; style?: React.CSSProperties }> = ({ message, style }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#b91c1c', fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px', ...style }}>
    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
    <span>{message}</span>
  </div>
);

// Cặp nút Check/X "Xác nhận thêm / Hủy" dùng chung cho hàng "thêm mới" — 3 chỗ trước đây tự viết lặp lại y hệt.
const ConfirmCancelButtons: React.FC<{ onConfirm: () => void; onCancel: () => void; justify?: 'center' | 'flex-end' }> = ({ onConfirm, onCancel, justify = 'center' }) => (
  <div style={{ display: 'flex', gap: '10px', justifyContent: justify }}>
    <button type="button" onClick={onConfirm} style={iconBtnStyle} className="pcp-icon-btn pcp-icon-btn--edit" title="Xác nhận thêm">
      <Check size={14} />
    </button>
    <button type="button" onClick={onCancel} style={iconBtnStyle} className="pcp-icon-btn" title="Hủy">
      <X size={14} />
    </button>
  </div>
);

const ValueDisplay: React.FC<{ value: number; unit?: string; dirty?: boolean }> = ({ value, unit, dirty }) => (
  <div style={{ ...valueBoxStyle, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
    <span style={{ fontWeight: 800, fontSize: '12.5px', color: dirty ? '#b45309' : '#0f172a' }}>{formatNumberVN(value)}</span>
    {unit && <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{unit}</span>}
  </div>
);

// Input số dùng chung cho cả 2 biến thể tiền/phần trăm — cùng khung ngoài (cột + lỗi inline) và vị
// trí suffix, chỉ khác cách nhập/định dạng/kẹp giá trị. MoneyField/PercentField bên dưới là 2 lớp vỏ
// mỏng giữ nguyên API cũ (props/behavior y hệt trước) để không phải đổi lại ~12 chỗ đang gọi.
const NumberField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
  dirty?: boolean;
  width?: string;
  autoFocus?: boolean;
  suffix: string;
  suffixWidth: string;
  inputType: 'text-money' | 'number-percent';
  step?: string;
  clamp: (v: number) => number;
}> = ({ value, onChange, error, dirty, width, autoFocus, suffix, suffixWidth, inputType, step, clamp }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: width || '100%' }}>
    <div style={{ position: 'relative' }}>
      {inputType === 'text-money' ? (
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={formatNumberVN(value)}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value.replace(/\D/g, '')) || 0))}
          style={{ ...inputStyle, paddingRight: suffixWidth, borderColor: error ? '#dc2626' : dirty ? '#f59e0b' : '#cbd5e1' }}
        />
      ) : (
        <input
          type="number"
          className="pcp-num-input"
          min={0}
          max={100}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0))}
          style={{ ...inputStyle, paddingRight: suffixWidth, borderColor: error ? '#dc2626' : '#cbd5e1' }}
        />
      )}
      <span style={suffixStyle}>{suffix}</span>
    </div>
    {error && <span style={fieldErrorStyle}>{error}</span>}
  </div>
);

// Input tiền tệ dùng chung — tự format dấu chấm ngăn cách nghìn, hiện suffix "VNĐ", báo lỗi inline
const MoneyField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
  dirty?: boolean;
  width?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, error, dirty, width, autoFocus }) => (
  <NumberField
    value={value}
    onChange={onChange}
    error={error}
    dirty={dirty}
    width={width}
    autoFocus={autoFocus}
    suffix="VNĐ"
    suffixWidth="34px"
    inputType="text-money"
    clamp={clampMoney}
  />
);

// Input phần trăm dùng chung — hiện suffix "%", báo lỗi inline
const PercentField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
  width?: string;
  step?: string;
}> = ({ value, onChange, error, width, step }) => (
  <NumberField
    value={value}
    onChange={onChange}
    error={error}
    width={width}
    step={step}
    suffix="%"
    suffixWidth="26px"
    inputType="number-percent"
    clamp={clampPercent}
  />
);

export const PricingConfigPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'SOURCE' | 'RULES'>('SOURCE');

  const [baseMetals, setBaseMetals] = useState<BaseMetal[]>([]);
  const [initialBaseMetals, setInitialBaseMetals] = useState<BaseMetal[]>([]);
  const [addingBaseMetal, setAddingBaseMetal] = useState(false);
  const [newBaseMetalName, setNewBaseMetalName] = useState('');
  const [baseMetalError, setBaseMetalError] = useState<string | null>(null);
  const [showMetalHistory, setShowMetalHistory] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [initialMaterials, setInitialMaterials] = useState<Material[]>([]);
  const [editingMaterialIds, setEditingMaterialIds] = useState<string[]>([]);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState<{ name: string; priceRatioPct: string; pricingFormulaId: string; baseMetalId: string }>({ name: '', priceRatioPct: '100', pricingFormulaId: '', baseMetalId: '' });
  const [materialError, setMaterialError] = useState<string | null>(null);
  // Công thức tính lãi — gắn theo NHÓM (Material.pricingFormulaId), thay bảng lợi nhuận/hệ số
  // nhân Bạc cũ vốn gom chung 1 JSON tách rời trong pricing_config
  const [formulas, setFormulas] = useState<PricingFormula[]>([]);
  const [initialFormulas, setInitialFormulas] = useState<PricingFormula[]>([]);
  const [editingFormulaIds, setEditingFormulaIds] = useState<string[]>([]);
  const [addingFormula, setAddingFormula] = useState(false);
  const [newFormula, setNewFormula] = useState<{ name: string; formulaType: PricingFormulaType }>({ name: '', formulaType: 'MARGIN_TIERS' });
  const [formulaError, setFormulaError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [initialCategories, setInitialCategories] = useState<CategoryItem[]>([]);
  const [editingCategoryIds, setEditingCategoryIds] = useState<string[]>([]);
  const [pendingDeleteCategoryIds, setPendingDeleteCategoryIds] = useState<string[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [newCategory, setNewCategory] = useState<{ name: string; laborCost: string; vatRate: string }>({ name: '', laborCost: '', vatRate: '10' });

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
    Promise.all([fetchStones(), fetchMasterData(), fetchBaseMetals(), fetchPricingFormulas()])
      .then(([stoneRows, master, metals, formulaRows]) => {
        const metalList: BaseMetal[] = Array.isArray(metals) ? metals : [];
        setBaseMetals(metalList);
        setInitialBaseMetals(metalList);
        const loadedStones = Array.isArray(stoneRows) ? stoneRows : [];
        setStones(loadedStones);
        setInitialStones(loadedStones);
        setPendingDeleteStoneIds([]);
        // Decimal từ Prisma có thể về dạng string qua JSON — ép vatRate về number ngay lúc load
        const cats = (Array.isArray(master?.categories) ? master.categories : []).map((c: CategoryItem) => ({
          ...c,
          vatRate: c.vatRate != null ? Number(c.vatRate) : 10,
        }));
        setCategories(cats);
        setInitialCategories(cats);
        // Decimal từ Prisma có thể về dạng string qua JSON — ép về number ngay lúc load để mọi so
        // sánh (dirty-check, validation range 0-100) chạy đúng, không phụ thuộc kiểu dữ liệu API trả.
        const mats = (Array.isArray(master?.materials) ? master.materials : []).map((m: Material) => ({
          ...m,
          priceRatioPct: Number(m.priceRatioPct),
        }));
        setMaterials(mats);
        setInitialMaterials(mats);
        const loadedFormulas = Array.isArray(formulaRows) ? formulaRows : [];
        setFormulas(loadedFormulas);
        setInitialFormulas(loadedFormulas);
        if (loadedFormulas.length > 0) {
          setNewMaterial((s) => (s.pricingFormulaId ? s : { ...s, pricingFormulaId: loadedFormulas[0].id }));
        }
      })
      .catch((err) => setError(err.message || 'Không thể tải cấu hình giá'));
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
    return original && ((c.laborCost || 0) !== (original.laborCost || 0) || (c.vatRate || 0) !== (original.vatRate || 0));
  });

  const changedStonePrices = stones.filter((s) => {
    if (pendingDeleteStoneIds.includes(s.id)) return false;
    const original = initialStones.find((o) => o.id === s.id);
    return original && original.price !== s.price;
  });

  const changedBaseMetals = baseMetals.filter((m) => {
    const original = initialBaseMetals.find((o) => o.id === m.id);
    return original && original.priceVnd !== m.priceVnd;
  });
  const metalPricesDirty = changedBaseMetals.length > 0;

  const categoriesDirty = changedCategories.length > 0 || pendingDeleteCategoryIds.length > 0;
  const stonesDirty = changedStonePrices.length > 0 || pendingDeleteStoneIds.length > 0;

  const changedMaterials = materials.filter((m) => {
    const original = initialMaterials.find((o) => o.id === m.id);
    return original && (original.priceRatioPct !== m.priceRatioPct || original.pricingFormulaId !== m.pricingFormulaId || original.baseMetalId !== m.baseMetalId);
  });
  const materialsDirty = changedMaterials.length > 0;

  const changedFormulas = formulas.filter((f) => {
    const original = initialFormulas.find((o) => o.id === f.id);
    return original && JSON.stringify(original.config) !== JSON.stringify(f.config);
  });
  const formulasDirty = changedFormulas.length > 0;

  const hasPendingChanges = metalPricesDirty || categoriesDirty || stonesDirty || materialsDirty || formulasDirty;

  // Validation: số âm ở bất kỳ đâu, hoặc % vượt quá 100 — chặn nút Lưu
  const marginPctError = (pct: number) => (pct < 0 ? 'Không được âm' : pct > 100 ? 'Tối đa 100%' : null);
  const hasValidationError =
    categories.some((c) => !!marginPctError(c.vatRate || 0)) ||
    materials.some((m) => m.priceRatioPct < 0 || m.priceRatioPct > 1000) ||
    formulas.some((f) =>
      f.formulaType === 'MULTIPLIER'
        ? (f.config.multipliers || []).some((v) => v < 0)
        : (f.config.tiers || []).some((t) => !!marginPctError(parseFloat(t.margin) || 0)),
    );

  // 1 API call gộp cho từng loại field/thực thể nào thực sự thay đổi so với dữ liệu gốc đã tải
  const handleSaveConfig = async () => {
    if (!hasPendingChanges) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        metalPricesDirty
          ? Promise.all(changedBaseMetals.map((m) => updateBaseMetalPrice(m.id, m.priceVnd)))
          : Promise.resolve(),
        categoriesDirty
          ? updateProductCategoriesBulk(changedCategories.map((c) => ({ id: c.id, laborCost: c.laborCost || 0, vatRate: c.vatRate || 0 })))
          : Promise.resolve(),
        changedStonePrices.length > 0
          ? updateStonePrices(changedStonePrices.map((s) => ({ id: s.id, price: s.price })))
          : Promise.resolve(),
        pendingDeleteStoneIds.length > 0 ? deleteStonesMany(pendingDeleteStoneIds) : Promise.resolve(),
        pendingDeleteCategoryIds.length > 0 ? deleteProductCategoriesMany(pendingDeleteCategoryIds) : Promise.resolve(),
        materialsDirty
          ? Promise.all(changedMaterials.map((m) => updateMaterial(m.id, { priceRatioPct: m.priceRatioPct, pricingFormulaId: m.pricingFormulaId, baseMetalId: m.baseMetalId })))
          : Promise.resolve(),
        formulasDirty
          ? Promise.all(changedFormulas.map((f) => updatePricingFormula(f.id, { config: f.config })))
          : Promise.resolve(),
      ]);

      setInitialBaseMetals(baseMetals);
      setInitialMaterials(materials);
      setInitialFormulas(formulas);
      const remainingCategories = categories.filter((c) => !pendingDeleteCategoryIds.includes(c.id));
      setCategories(remainingCategories);
      setInitialCategories(remainingCategories);
      setPendingDeleteCategoryIds([]);
      const remainingStones = stones.filter((s) => !pendingDeleteStoneIds.includes(s.id));
      setStones(remainingStones);
      setInitialStones(remainingStones);
      setPendingDeleteStoneIds([]);
      setEditingFormulaIds([]);
      setEditingMaterialIds([]);
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
    setBaseMetals(initialBaseMetals);
    setCategories(initialCategories);
    setPendingDeleteCategoryIds([]);
    setStones(initialStones);
    setPendingDeleteStoneIds([]);
    setMaterials(initialMaterials);
    setFormulas(initialFormulas);
    setEditingFormulaIds([]);
    setEditingMaterialIds([]);
    setEditingCategoryIds([]);
    setEditingStoneIds([]);
    setAddingCategory(false);
    setAddingStoneType(null);
    setAddingMaterial(false);
    setAddingFormula(false);
  };

  // Chỉ cập nhật local state — lưu xuống BE (PATCH /pricing-formulas/:id) khi bấm "Lưu cấu hình"
  const updateFormulaConfig = (formulaId: string, config: PricingFormula['config']) => {
    setFormulas((prev) => prev.map((f) => (f.id === formulaId ? { ...f, config } : f)));
  };

  const updateMultiplier = (formulaId: string, idx: number, val: number) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    const multipliers = [...(f.config.multipliers || [])];
    multipliers[idx] = val;
    updateFormulaConfig(formulaId, { ...f.config, multipliers });
  };

  const removeMultiplier = (formulaId: string, idx: number) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    updateFormulaConfig(formulaId, { ...f.config, multipliers: (f.config.multipliers || []).filter((_, i) => i !== idx) });
  };

  const addMultiplier = (formulaId: string) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    updateFormulaConfig(formulaId, { ...f.config, multipliers: [...(f.config.multipliers || []), 3] });
  };

  const updateTier = (formulaId: string, idx: number, patch: Partial<MarginTier>) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    const tiers = [...(f.config.tiers || [])];
    tiers[idx] = { ...tiers[idx], ...patch };
    updateFormulaConfig(formulaId, { ...f.config, tiers });
  };

  const removeTier = (formulaId: string, idx: number) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    updateFormulaConfig(formulaId, { ...f.config, tiers: (f.config.tiers || []).filter((_, i) => i !== idx) });
  };

  const addTier = (formulaId: string) => {
    const f = formulas.find((x) => x.id === formulaId);
    if (!f) return;
    updateFormulaConfig(formulaId, { ...f.config, tiers: [...(f.config.tiers || []), { maxCost: 0, divisor: 0.8, margin: '' }] });
  };

  // Thêm công thức mới lưu ngay (giống thêm chất liệu/đá) — không staged, tên là khóa định danh
  const handleAddFormula = async () => {
    setFormulaError(null);
    if (!newFormula.name.trim()) {
      setFormulaError('Vui lòng nhập tên công thức');
      return;
    }
    try {
      const config = newFormula.formulaType === 'MULTIPLIER' ? { multipliers: [3] } : { tiers: [{ maxCost: 0, divisor: 0.8, margin: '' }] };
      const created = await createPricingFormula({ name: newFormula.name.trim(), formulaType: newFormula.formulaType, config });
      setFormulas((prev) => [...prev, created]);
      setInitialFormulas((prev) => [...prev, created]);
      setNewFormula({ name: '', formulaType: 'MARGIN_TIERS' });
      setAddingFormula(false);
    } catch (err: any) {
      setFormulaError(err.message || 'Không thể thêm công thức');
    }
  };

  // Chỉ cập nhật local state — lưu xuống BE khi bấm nút "Lưu cấu hình" ở dưới
  const handleCategoryLaborCostChange = (id: string, laborCost: number) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, laborCost } : c)));
  };

  const handleCategoryVatRateChange = (id: string, vatRate: number) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, vatRate: clampPercent(vatRate) } : c)));
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
      const vatRate = clampPercent(parseFloat(newCategory.vatRate) || 0);
      const created = { ...(await createProductCategory(newCategory.name.trim(), laborCost, vatRate)), vatRate };
      setCategories((prev) => [...prev, created]);
      setInitialCategories((prev) => [...prev, created]);
      setNewCategory({ name: '', laborCost: '', vatRate: '10' });
      setAddingCategory(false);
    } catch (err: any) {
      setError(err.message || 'Không thể thêm danh mục sản phẩm');
    }
  };

  // Chỉ cập nhật local state — lưu xuống BE (PATCH /materials/:id) khi bấm "Lưu cấu hình" ở dưới
  const updateBaseMetalPriceLocal = (id: string, priceVnd: number) => {
    setBaseMetals((prev) => prev.map((m) => (m.id === id ? { ...m, priceVnd } : m)));
  };

  const handleAddBaseMetal = async () => {
    setBaseMetalError(null);
    if (!newBaseMetalName.trim()) {
      setBaseMetalError('Vui lòng nhập tên kim loại gốc');
      return;
    }
    try {
      const created = await createBaseMetal(newBaseMetalName.trim());
      setBaseMetals((prev) => [...prev, created]);
      setInitialBaseMetals((prev) => [...prev, created]);
      setNewBaseMetalName('');
      setAddingBaseMetal(false);
    } catch (err: any) {
      setBaseMetalError(err.message || 'Không thể thêm kim loại gốc');
    }
  };

  const handleToggleBaseMetalActive = async (id: string, isActive: boolean) => {
    await setBaseMetalActive(id, isActive);
    setBaseMetals((prev) => prev.map((m) => (m.id === id ? { ...m, isActive } : m)));
    setInitialBaseMetals((prev) => prev.map((m) => (m.id === id ? { ...m, isActive } : m)));
  };

  const updateMaterialRatio = (id: string, priceRatioPct: number) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, priceRatioPct } : m)));
  };

  const updateMaterialFormula = (id: string, pricingFormulaId: string) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, pricingFormulaId } : m)));
  };

  const updateMaterialBaseMetal = (id: string, baseMetalId: string) => {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, baseMetalId: baseMetalId || null } : m)));
  };

  // Thêm chất liệu mới lưu ngay (giống thêm đá/danh mục) — không staged, vì tên chất liệu là khóa
  // định danh (unique) nên tạo mới cần phản hồi ngay để biết trùng tên hay không.
  const handleAddMaterial = async () => {
    setMaterialError(null);
    const ratio = clampMaterialRatio(parseFloat(newMaterial.priceRatioPct) || 0);
    if (!newMaterial.name.trim()) {
      setMaterialError('Vui lòng nhập tên chất liệu');
      return;
    }
    if (!newMaterial.pricingFormulaId) {
      setMaterialError('Vui lòng chọn công thức tính lãi cho chất liệu');
      return;
    }
    try {
      const created = { ...(await createMaterial(newMaterial.name.trim(), ratio, newMaterial.pricingFormulaId, newMaterial.baseMetalId || undefined)), priceRatioPct: ratio };
      setMaterials((prev) => [...prev, created]);
      setInitialMaterials((prev) => [...prev, created]);
      setNewMaterial((s) => ({ name: '', priceRatioPct: '100', pricingFormulaId: s.pricingFormulaId, baseMetalId: s.baseMetalId }));
      setAddingMaterial(false);
    } catch (err: any) {
      setMaterialError(err.message || 'Không thể thêm chất liệu');
    }
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
      setImportResult(
        result.skipped > 0
          ? `Đã import ${result.imported} đá (bỏ qua ${result.skipped} đá trùng tên/cut/size)`
          : `Đã import ${result.imported} đá`,
      );
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

      {error && <ErrorBanner message={error} style={{ marginBottom: '14px' }} />}

      {/* Panel duy nhất — header + tabs + nội dung + footer sticky, giống mockup */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px' }}>
        <div style={{ padding: '22px 22px 0' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={22} /> Cấu hình giá</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Quản lý nguồn giá gốc và quy tắc tính giá bán cho hệ thống kho.</p>

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
              {/* Giá kim loại quý — danh sách ĐỘNG, thêm kim loại mới không cần sửa code */}
              <PanelSection
                first
                title="Giá kim loại quý (VNĐ/chỉ)"
                icon={Coins}
                action={
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setShowMetalHistory(true)} style={btnGhostSmallStyle}><History size={12} /> Lịch sử giá</button>
                    <button type="button" onClick={() => { setBaseMetalError(null); setAddingBaseMetal(true); }} style={btnGhostSmallStyle}><Plus size={12} /> Thêm kim loại</button>
                  </div>
                }
              >
                {baseMetalError && <ErrorBanner message={baseMetalError} style={{ marginBottom: '12px' }} />}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px' }}>
                  {baseMetals.map((m) => {
                    const original = initialBaseMetals.find((o) => o.id === m.id);
                    const dirty = !!original && original.priceVnd !== m.priceVnd;
                    return (
                      <div key={m.id} style={{ opacity: m.isActive ? 1 : 0.5 }}>
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }} title={m.isActive ? 'Đang dùng — bỏ tích để ngừng dùng' : 'Đã ngừng dùng — tích để bật lại'}>
                          <input
                            type="checkbox"
                            checked={m.isActive}
                            onChange={() => handleToggleBaseMetalActive(m.id, !m.isActive)}
                          />
                          {m.name}{m.isDefault ? ' (mặc định)' : ''}
                        </label>
                        <MoneyField value={m.priceVnd} onChange={(v) => updateBaseMetalPriceLocal(m.id, v)} dirty={dirty} />
                      </div>
                    );
                  })}
                  {addingBaseMetal && (
                    <div>
                      <label style={labelStyle}>Kim loại mới</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input autoFocus value={newBaseMetalName} onChange={(e) => setNewBaseMetalName(e.target.value)} style={inputStyle} placeholder="VD: Titanium" />
                        <ConfirmCancelButtons onConfirm={handleAddBaseMetal} onCancel={() => setAddingBaseMetal(false)} />
                      </div>
                    </div>
                  )}
                </div>
              </PanelSection>

              {/* Chất liệu & % tính giá — % nhân với giá kim loại gốc lúc tính (vàng theo tuổi: vd 18K=75; Bạc/Bạch kim = 100) */}
              <PanelSection
                title="Chất liệu & Phần trăm tính giá"
                icon={Layers}
                action={<button type="button" onClick={() => { setMaterialError(null); setAddingMaterial(true); }} style={btnGhostSmallStyle}><Plus size={12} /> Thêm chất liệu</button>}
              >
                {materialError && <ErrorBanner message={materialError} style={{ marginBottom: '12px' }} />}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={tableHeadRowStyle}>
                        <th style={{ ...thStyle, width: '24%' }}>Tên chất liệu</th>
                        <th style={{ ...thStyle, width: '18%' }}>Kim loại gốc</th>
                        <th style={{ ...thStyle, width: '16%' }}>% tính giá</th>
                        <th style={{ ...thStyle, width: '32%' }}>Công thức tính lãi</th>
                        <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => {
                        const original = initialMaterials.find((o) => o.id === m.id);
                        const rowDirty = !!original && (original.priceRatioPct !== m.priceRatioPct || original.pricingFormulaId !== m.pricingFormulaId);
                        const isEditing = editingMaterialIds.includes(m.id);
                        const ratioError = m.priceRatioPct < 0 ? 'Không được âm' : m.priceRatioPct > 1000 ? 'Tối đa 1000%' : null;
                        const formulaName = formulas.find((f) => f.id === m.pricingFormulaId)?.name || '—';
                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: rowDirty ? '#fffbeb' : undefined }}>
                            <td style={tdStyle}>
                              <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a' }}>{m.name}</span>
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <select value={m.baseMetalId || ''} onChange={(e) => updateMaterialBaseMetal(m.id, e.target.value)} style={inputStyle}>
                                  <option value="">— Phi kim loại —</option>
                                  {baseMetals.filter((bm) => bm.isActive).map((bm) => (
                                    <option key={bm.id} value={bm.id}>{bm.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 700, color: '#334155' }}>{m.baseMetal?.name || '— Phi kim loại —'}</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <input type="number" className="pcp-num-input" min={0} max={1000} step="0.001" value={m.priceRatioPct} onChange={(e) => updateMaterialRatio(m.id, clampMaterialRatio(parseFloat(e.target.value) || 0))} style={{ ...inputStyle, borderColor: ratioError ? '#dc2626' : '#cbd5e1' }} />
                                  {ratioError && <span style={fieldErrorStyle}>{ratioError}</span>}
                                </div>
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 700, color: '#334155' }}>{m.priceRatioPct}%</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {isEditing ? (
                                <select value={m.pricingFormulaId} onChange={(e) => updateMaterialFormula(m.id, e.target.value)} style={inputStyle}>
                                  {formulas.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ ...valueBoxStyle, fontWeight: 700, color: '#334155' }}>{formulaName}</span>
                              )}
                            </td>
                            <td style={tdCenterStyle}>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <EditIconButton onClick={() => setEditingMaterialIds((prev) => toggleInArray(prev, m.id))} active={isEditing} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {materials.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có chất liệu nào</td></tr>
                      )}
                      {addingMaterial && (
                        <tr className="pcp-add-row">
                          <td style={tdStyle}><input autoFocus value={newMaterial.name} onChange={(e) => setNewMaterial((s) => ({ ...s, name: e.target.value }))} style={inputStyle} placeholder="VD: Vàng 16K" /></td>
                          <td style={tdStyle}>
                            <select value={newMaterial.baseMetalId} onChange={(e) => setNewMaterial((s) => ({ ...s, baseMetalId: e.target.value }))} style={inputStyle}>
                              <option value="">— Phi kim loại —</option>
                              {baseMetals.filter((bm) => bm.isActive).map((bm) => (
                                <option key={bm.id} value={bm.id}>{bm.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={tdStyle}><input type="number" className="pcp-num-input" min={0} max={1000} step="0.001" value={newMaterial.priceRatioPct} onChange={(e) => setNewMaterial((s) => ({ ...s, priceRatioPct: e.target.value }))} style={inputStyle} /></td>
                          <td style={tdStyle}>
                            <select value={newMaterial.pricingFormulaId} onChange={(e) => setNewMaterial((s) => ({ ...s, pricingFormulaId: e.target.value }))} style={inputStyle}>
                              {formulas.length === 0 && <option value="">Chưa có công thức</option>}
                              {formulas.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                          <td style={tdCenterStyle}>
                            <ConfirmCancelButtons onConfirm={handleAddMaterial} onCancel={() => setAddingMaterial(false)} />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </PanelSection>

              {/* Quản lý bảng giá đá */}
              <PanelSection
                title="Quản lý bảng giá đá"
                icon={Gem}
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
                      {importing ? <Loader2 size={12} className="pcp-spin" /> : <Upload size={12} />} Nhập Excel
                    </button>
                  </>
                }
              >
                {stoneError && (
                  <ErrorBanner message={stoneError} style={{ marginBottom: '12px', whiteSpace: 'pre-line', maxHeight: '160px', overflowY: 'auto' }} />
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
            <div className="pcp-rules-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 2fr)', gap: '20px', alignItems: 'start', padding: '22px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* VAT giờ cấu hình theo từng danh mục sản phẩm — xem panel "Tiền công / VAT" bên phải */}

              {/* Công thức tính lãi — gắn theo NHÓM, nhiều chất liệu (bảng bên tab Nguồn giá gốc)
                  trỏ chung 1 công thức. Thêm kim loại/chất liệu mới chỉ cần trỏ tới công thức có
                  sẵn hoặc tạo công thức mới ở đây — không cần sửa code. */}
              {formulaError && <ErrorBanner message={formulaError} />}
              {formulas.map((f) => {
                const isEditing = editingFormulaIds.includes(f.id);
                const usedByCount = materials.filter((m) => m.pricingFormulaId === f.id).length;
                return (
                  <RuleCard
                    key={f.id}
                    title={f.name}
                    icon={f.formulaType === 'MULTIPLIER' ? Percent : TrendingUp}
                    subtitle={
                      (f.formulaType === 'MULTIPLIER'
                        ? 'Nhân thẳng 1 hệ số cố định lên chi phí đã có VAT.'
                        : 'Tra bậc lợi nhuận theo mốc chi phí sản xuất.') +
                      ` Đang dùng bởi ${usedByCount} chất liệu.` +
                      (f.isDefault ? ' • Mặc định tính lãi phần Đá.' : '')
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => (f.formulaType === 'MULTIPLIER' ? addMultiplier(f.id) : addTier(f.id))}
                        style={btnGhostSmallStyle}
                      >
                        <Plus size={12} /> {f.formulaType === 'MULTIPLIER' ? 'Thêm hệ số' : 'Thêm bậc'}
                      </button>
                    }
                  >
                    {f.formulaType === 'MULTIPLIER' ? (
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
                            {(f.config.multipliers || []).map((mult, idx) => {
                              const multError = mult < 0 ? 'Không được âm' : null;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ ...tdStyle, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</td>
                                  <td style={tdStyle}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <input type="number" className="pcp-num-input" min={0} step="0.1" value={mult} onChange={(e) => updateMultiplier(f.id, idx, Math.max(0, parseFloat(e.target.value) || 0))} style={{ ...inputStyle, width: '100px', borderColor: multError ? '#dc2626' : '#cbd5e1' }} />
                                        {multError && <span style={fieldErrorStyle}>{multError}</span>}
                                      </div>
                                    ) : (
                                      <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a' }}>{mult}</span>
                                    )}
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                      <EditIconButton onClick={() => setEditingFormulaIds((prev) => toggleInArray(prev, f.id))} active={isEditing} />
                                      <DeleteIconButton onClick={() => removeMultiplier(f.id, idx)} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {(f.config.multipliers || []).length === 0 && (
                              <tr><td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có hệ số nào</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
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
                            {(f.config.tiers || []).map((tier, idx) => {
                              const marginPct = parseFloat(tier.margin) || 0;
                              const pctError = marginPctError(marginPct);
                              const isUnlimited = tier.maxCost >= UNLIMITED_MAX_COST;
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={tdStyle}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#6b7280', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                          <input type="checkbox" checked={isUnlimited} onChange={(e) => updateTier(f.id, idx, { maxCost: e.target.checked ? UNLIMITED_MAX_COST : 0 })} />
                                          Không giới hạn
                                        </label>
                                        {!isUnlimited && <MoneyField value={tier.maxCost} onChange={(v) => updateTier(f.id, idx, { maxCost: v })} />}
                                      </div>
                                    ) : (
                                      isUnlimited ? <span style={{ ...valueBoxStyle, fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>Không giới hạn</span> : <ValueDisplay value={tier.maxCost} unit="VNĐ" />
                                    )}
                                  </td>
                                  <td style={tdStyle}>
                                    {isEditing ? (
                                      <PercentField value={marginPct} onChange={(pct) => updateTier(f.id, idx, { margin: `${pct}%`, divisor: (100 - pct) / 100 })} error={pctError} width="140px" />
                                    ) : (
                                      <ValueDisplay value={marginPct} unit="%" />
                                    )}
                                  </td>
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                      <EditIconButton onClick={() => setEditingFormulaIds((prev) => toggleInArray(prev, f.id))} active={isEditing} />
                                      <DeleteIconButton onClick={() => removeTier(f.id, idx)} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {(f.config.tiers || []).length === 0 && (
                              <tr><td colSpan={3} style={{ padding: '14px', textAlign: 'center', color: '#94a3b8' }}>Chưa có bậc lợi nhuận nào</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </RuleCard>
                );
              })}

              {/* Thêm công thức mới — lưu ngay (giống thêm chất liệu/đá), sửa nội dung bên trong sau */}
              <RuleCard title="Thêm công thức mới" icon={PlusCircle}>
                {addingFormula ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px' }}>
                    <input autoFocus value={newFormula.name} onChange={(e) => setNewFormula((s) => ({ ...s, name: e.target.value }))} style={inputStyle} placeholder="VD: Bậc lợi nhuận Bạch kim cao cấp" />
                    <select value={newFormula.formulaType} onChange={(e) => setNewFormula((s) => ({ ...s, formulaType: e.target.value as PricingFormulaType }))} style={inputStyle}>
                      <option value="MARGIN_TIERS">Bậc lợi nhuận theo chi phí</option>
                      <option value="MULTIPLIER">Hệ số nhân cố định</option>
                    </select>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={handleAddFormula} style={btnPrimaryStyle}><Check size={13} /> Thêm</button>
                      <button type="button" onClick={() => setAddingFormula(false)} style={btnSecondaryStyle}><X size={13} /> Hủy</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setFormulaError(null); setAddingFormula(true); }} style={btnGhostSmallStyle}><Plus size={12} /> Thêm công thức</button>
                )}
              </RuleCard>
            </div>

            {/* Tiền công / VAT theo danh mục sản phẩm — panel riêng bên phải, gọn, giống ảnh mockup */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={15} style={{ color: '#64748b', flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Tiền công / VAT</h3>
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
                      onVatRateChange={handleCategoryVatRateChange}
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
              ...(saved ? { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' } : null),
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

      <MetalPriceHistoryModal isOpen={showMetalHistory} onClose={() => setShowMetalHistory(false)} baseMetals={baseMetals} />
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
  onVatRateChange: (id: string, vatRate: number) => void;
  onToggleDelete: (id: string) => void;
  onToggleEdit: (id: string) => void;
  adding: boolean;
  onCloseAdd: () => void;
  newCategory: { name: string; laborCost: string; vatRate: string };
  setNewCategory: React.Dispatch<React.SetStateAction<{ name: string; laborCost: string; vatRate: string }>>;
  onConfirmAdd: () => void;
}> = ({ items, initialCategories, pendingDeleteIds, editingIds, onLaborCostChange, onVatRateChange, onToggleDelete, onToggleEdit, adding, onCloseAdd, newCategory, setNewCategory, onConfirmAdd }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((c) => {
        const original = initialCategories.find((o) => o.id === c.id);
        const markedDelete = pendingDeleteIds.includes(c.id);
        const isDirty = !markedDelete && !!original && ((original.laborCost || 0) !== (c.laborCost || 0) || (original.vatRate || 0) !== (c.vatRate || 0));
        const isEditing = editingIds.includes(c.id);
        return (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '9px 0', borderBottom: '1px solid #f1f5f9', background: markedDelete ? '#fef2f2' : isDirty ? '#fffbeb' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: markedDelete ? '#94a3b8' : '#334155', textDecoration: markedDelete ? 'line-through' : 'none' }}>{c.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <EditIconButton onClick={() => onToggleEdit(c.id)} active={isEditing} title={markedDelete ? undefined : (isEditing ? 'Đóng sửa' : 'Sửa')} />
                <DeleteIconButton onClick={() => onToggleDelete(c.id)} marked={markedDelete} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Tiền công</label>
                {isEditing && !markedDelete ? (
                  <MoneyField value={c.laborCost || 0} onChange={(v) => onLaborCostChange(c.id, v)} width="100%" />
                ) : (
                  <span style={{ ...valueBoxStyle, display: 'block', width: '100%', boxSizing: 'border-box', fontSize: '12.5px', fontWeight: 800, color: isDirty ? '#b45309' : '#0f172a' }}>{formatNumberVN(c.laborCost || 0)}</span>
                )}
              </div>
              <div style={{ width: '70px', flexShrink: 0 }}>
                <label style={{ fontSize: '9.5px', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '2px' }}>VAT</label>
                {isEditing && !markedDelete ? (
                  <PercentField value={c.vatRate || 0} onChange={(v) => onVatRateChange(c.id, v)} width="100%" />
                ) : (
                  <span style={{ ...valueBoxStyle, fontSize: '12.5px', fontWeight: 800, color: isDirty ? '#b45309' : '#0f172a' }}>{c.vatRate || 0}%</span>
                )}
              </div>
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <MoneyField value={parseFloat(newCategory.laborCost) || 0} onChange={(v) => setNewCategory((s) => ({ ...s, laborCost: String(v) }))} />
            <PercentField value={parseFloat(newCategory.vatRate) || 0} onChange={(v) => setNewCategory((s) => ({ ...s, vatRate: String(v) }))} width="90px" />
          </div>
          <ConfirmCancelButtons onConfirm={onConfirmAdd} onCancel={onCloseAdd} justify="flex-end" />
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
                  <ConfirmCancelButtons onConfirm={onConfirmAdd} onCancel={onCloseAdd} />
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
