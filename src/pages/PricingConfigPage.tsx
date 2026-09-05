import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Pencil, Check, X, Upload, AlertTriangle, RotateCcw, Loader2, CheckCircle2, XCircle, Wrench, Coins, Layers, Gem, PlusCircle, TrendingUp, Percent, History, Settings, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { MetalPriceHistoryModal } from '../components/MetalPriceHistoryModal';
import {
  fetchStones,
  createStone,
  updateStonePrices,
  deleteStonesMany,
  importStonesExcel,
  fetchMasterData,
  invalidateMasterData,
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
import { thCls, tdCls, tdCenterCls, tableHeadRowCls, labelCls, btnPrimaryCls, btnSecondaryCls, btnGhostSmallCls, pageBtnCls, inputCls, valueBoxCls, suffixCls, fieldErrorCls, pcpIconBtnCls, pcpIconBtnEditCls, pcpIconBtnUndoCls, numInputCls, pcpTabCls, pcpTabActiveCls, pcpAddRowCls } from '../styles/classNames';
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
  <div className="flex items-center justify-between flex-wrap gap-[10px] mb-[14px]">
    <div className="flex items-center gap-[8px] min-w-0">
      {Icon ? <Icon size={15} className="text-[#0f172a] shrink-0" /> : <span className="w-[8px] h-[8px] rounded-full bg-[#0f172a] shrink-0" />}
      <h3 className="text-[13.5px] font-extrabold text-[#0f172a] m-0 [word-break:keep-all]">{title}</h3>
    </div>
    {action}
  </div>
);

const PanelSection: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode; first?: boolean; icon?: LucideIcon }> = ({ title, action, children, first, icon }) => (
  <div className={clsx('py-[22px] px-0', first ? 'border-t-0' : 'border-t border-[#e5e7eb]')}>
    <SectionHeader title={title} action={action} icon={icon} />
    {children}
  </div>
);

// Thẻ khung viền riêng cho từng mục ở tab "Quy tắc tính giá bán" — chỉ dùng trong tab này, không đụng PanelSection (tab Nguồn giá gốc)
const RuleCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; icon?: LucideIcon }> = ({ title, subtitle, action, children, icon }) => (
  <div className="border border-[#e5e7eb] rounded-[12px] p-[18px]">
    <SectionHeader title={title} action={action} icon={icon} />
    {subtitle && <p className="text-[11.5px] text-[#94a3b8] -mt-[6px] mr-0 mb-[12px] ml-0">{subtitle}</p>}
    {children}
  </div>
);

const EditIconButton: React.FC<{ onClick: () => void; active?: boolean; title?: string }> = ({ onClick, active, title }) => (
  <button type="button" onClick={onClick} className={clsx(pcpIconBtnCls, pcpIconBtnEditCls)} title={title || (active ? 'Đóng sửa' : 'Sửa')}>
    <Pencil size={13} />
  </button>
);

const DeleteIconButton: React.FC<{ onClick: () => void; marked?: boolean; title?: string }> = ({ onClick, marked, title }) => (
  <button type="button" onClick={onClick} className={clsx(pcpIconBtnCls, marked && pcpIconBtnUndoCls)} title={title || (marked ? 'Bỏ đánh dấu xóa' : 'Đánh dấu xóa')}>
    {marked ? <RotateCcw size={13} /> : <Trash2 size={13} />}
  </button>
);

// Banner lỗi màu đỏ dùng chung cho các chỗ báo lỗi trong trang.
const ErrorBanner: React.FC<{ message: string; className?: string }> = ({ message, className }) => (
  <div className={clsx('flex items-start gap-[6px] text-[#b91c1c] text-[11.5px] bg-[#fef2f2] border border-[#fca5a5] py-[8px] px-[10px] rounded-[8px]', className)}>
    <AlertTriangle size={14} className="shrink-0 mt-[1px]" />
    <span>{message}</span>
  </div>
);

// Cặp nút Check/X "Xác nhận thêm / Hủy" dùng chung cho các hàng "thêm mới".
const ConfirmCancelButtons: React.FC<{ onConfirm: () => void; onCancel: () => void; justify?: 'center' | 'flex-end' }> = ({ onConfirm, onCancel, justify = 'center' }) => (
  <div className={clsx('flex gap-[10px]', justify === 'flex-end' ? 'justify-end' : 'justify-center')}>
    <button type="button" onClick={onConfirm} className={clsx(pcpIconBtnCls, pcpIconBtnEditCls)} title="Xác nhận thêm">
      <Check size={14} />
    </button>
    <button type="button" onClick={onCancel} className={pcpIconBtnCls} title="Hủy">
      <X size={14} />
    </button>
  </div>
);

const ValueDisplay: React.FC<{ value: number; unit?: string; dirty?: boolean }> = ({ value, unit, dirty }) => (
  <div className={clsx(valueBoxCls, 'flex items-baseline gap-[6px]')}>
    <span className={clsx('font-extrabold text-[12.5px]', dirty ? 'text-[#b45309]' : 'text-[#0f172a]')}>{formatNumberVN(value)}</span>
    {unit && <span className="text-[11px] font-bold text-[#94a3b8]">{unit}</span>}
  </div>
);

// Input số dùng chung cho cả 2 biến thể tiền/phần trăm — cùng khung ngoài (cột + lỗi inline) và vị
// trí suffix, chỉ khác cách nhập/định dạng/kẹp giá trị. MoneyField/PercentField bên dưới là 2 lớp vỏ mỏng.
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
  <div
    className="flex flex-col gap-[2px]"
    // động — giữ inline
    style={{ width: width || '100%' }}
  >
    <div className="relative">
      {inputType === 'text-money' ? (
        <input
          type="text"
          inputMode="numeric"
          autoFocus={autoFocus}
          value={formatNumberVN(value)}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value.replace(/\D/g, '')) || 0))}
          className={clsx(inputCls, error ? 'border-[#dc2626]' : dirty ? 'border-[#f59e0b]' : 'border-[#cbd5e1]')}
          // động — giữ inline
          style={{ paddingRight: suffixWidth }}
        />
      ) : (
        <input
          type="number"
          className={clsx(numInputCls, inputCls, error ? 'border-[#dc2626]' : 'border-[#cbd5e1]')}
          min={0}
          max={100}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(parseFloat(e.target.value) || 0))}
          // động — giữ inline
          style={{ paddingRight: suffixWidth }}
        />
      )}
      <span className={suffixCls}>{suffix}</span>
    </div>
    {error && <span className={fieldErrorCls}>{error}</span>}
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
  // Công thức tính lãi — gắn theo NHÓM (Material.pricingFormulaId).
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
        // Cập nhật giá kim loại TUẦN TỰ, không Promise.all: mỗi PATCH chạy transaction Serializable
        // trên base_metal_price_history, gửi song song nhiều cái sẽ đụng nhau -> Postgres P2034.
        metalPricesDirty
          ? (async () => {
              for (const m of changedBaseMetals) {
                await updateBaseMetalPrice(m.id, m.priceVnd);
              }
            })()
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
      if (materialsDirty || categoriesDirty || metalPricesDirty || formulasDirty) {
        invalidateMasterData();
      }
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
      invalidateMasterData();
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
      invalidateMasterData();
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
      invalidateMasterData();
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
      invalidateMasterData();
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
    <div className="flex flex-col">
      {error && <ErrorBanner message={error} className="mb-[14px]" />}

      {/* Panel duy nhất — header + tabs + nội dung + footer sticky, giống mockup */}
      <div className="bg-surface border border-[#e5e7eb] rounded-[16px]">
        <div className="pt-[22px] px-[22px] pb-0">
          <h1 className="text-[24px] font-black text-[#0f172a] m-0 mb-[4px] tracking-[-0.3px] flex items-center gap-[10px]"><Settings size={22} /> Cấu hình giá</h1>
          <p className="text-[13px] text-muted m-0">Quản lý nguồn giá gốc và quy tắc tính giá bán cho hệ thống kho.</p>

          <div className="flex gap-[22px] mt-[18px] border-b border-[#e5e7eb]">
            <button type="button" className={clsx(pcpTabCls, activeTab === 'SOURCE' && pcpTabActiveCls)} onClick={() => setActiveTab('SOURCE')}>
              Nguồn giá gốc (Giá vốn)
            </button>
            <button type="button" className={clsx(pcpTabCls, activeTab === 'RULES' && pcpTabActiveCls)} onClick={() => setActiveTab('RULES')}>
              Quy tắc tính giá bán
            </button>
          </div>
        </div>

        <div className="py-0 px-[22px]">
          {activeTab === 'SOURCE' && (
            <>
              {/* Giá kim loại quý — danh sách ĐỘNG, thêm kim loại mới không cần sửa code */}
              <PanelSection
                first
                title="Giá kim loại quý (VNĐ/chỉ)"
                icon={Coins}
                action={
                  <div className="flex gap-[8px]">
                    <button type="button" onClick={() => setShowMetalHistory(true)} className={btnGhostSmallCls}><History size={12} /> Lịch sử giá</button>
                    <button type="button" onClick={() => { setBaseMetalError(null); setAddingBaseMetal(true); }} className={btnGhostSmallCls}><Plus size={12} /> Thêm kim loại</button>
                  </div>
                }
              >
                {baseMetalError && <ErrorBanner message={baseMetalError} className="mb-[12px]" />}
                <div className="grid [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] gap-[20px]">
                  {baseMetals.map((m) => {
                    const original = initialBaseMetals.find((o) => o.id === m.id);
                    const dirty = !!original && original.priceVnd !== m.priceVnd;
                    return (
                      <div key={m.id} className={m.isActive ? 'opacity-100' : 'opacity-50'}>
                        <label className={clsx(labelCls, 'flex items-center gap-[5px] cursor-pointer')} title={m.isActive ? 'Đang dùng — bỏ tích để ngừng dùng' : 'Đã ngừng dùng — tích để bật lại'}>
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
                      <label className={labelCls}>Kim loại mới</label>
                      <div className="flex gap-[6px]">
                        <input autoFocus value={newBaseMetalName} onChange={(e) => setNewBaseMetalName(e.target.value)} className={inputCls} placeholder="VD: Titanium" />
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
                action={<button type="button" onClick={() => { setMaterialError(null); setAddingMaterial(true); }} className={btnGhostSmallCls}><Plus size={12} /> Thêm chất liệu</button>}
              >
                {materialError && <ErrorBanner message={materialError} className="mb-[12px]" />}
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse text-[12.5px]">
                    <thead>
                      <tr className={tableHeadRowCls}>
                        <th className={clsx(thCls, 'w-[24%]')}>Tên chất liệu</th>
                        <th className={clsx(thCls, 'w-[18%]')}>Kim loại gốc</th>
                        <th className={clsx(thCls, 'w-[16%]')}>% tính giá</th>
                        <th className={clsx(thCls, 'w-[32%]')}>Công thức tính lãi</th>
                        <th className={clsx(thCls, 'w-[90px] text-center')}>Thao tác</th>
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
                          <tr key={m.id} className={clsx('border-b border-[#f1f5f9]', rowDirty && 'bg-[#fffbeb]')}>
                            <td className={tdCls}>
                              <span className={clsx(valueBoxCls, 'font-extrabold text-[#0f172a]')}>{m.name}</span>
                            </td>
                            <td className={tdCls}>
                              {isEditing ? (
                                <select value={m.baseMetalId || ''} onChange={(e) => updateMaterialBaseMetal(m.id, e.target.value)} className={inputCls}>
                                  <option value="">— Phi kim loại —</option>
                                  {baseMetals.filter((bm) => bm.isActive).map((bm) => (
                                    <option key={bm.id} value={bm.id}>{bm.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={clsx(valueBoxCls, 'font-bold text-[#334155]')}>{m.baseMetal?.name || '— Phi kim loại —'}</span>
                              )}
                            </td>
                            <td className={tdCls}>
                              {isEditing ? (
                                <div className="flex flex-col gap-[2px]">
                                  <input type="number" className={clsx(numInputCls, inputCls, ratioError ? 'border-[#dc2626]' : 'border-[#cbd5e1]')} min={0} max={1000} step="0.001" value={m.priceRatioPct} onChange={(e) => updateMaterialRatio(m.id, clampMaterialRatio(parseFloat(e.target.value) || 0))} />
                                  {ratioError && <span className={fieldErrorCls}>{ratioError}</span>}
                                </div>
                              ) : (
                                <span className={clsx(valueBoxCls, 'font-bold text-[#334155]')}>{m.priceRatioPct}%</span>
                              )}
                            </td>
                            <td className={tdCls}>
                              {isEditing ? (
                                <select value={m.pricingFormulaId} onChange={(e) => updateMaterialFormula(m.id, e.target.value)} className={inputCls}>
                                  {formulas.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={clsx(valueBoxCls, 'font-bold text-[#334155]')}>{formulaName}</span>
                              )}
                            </td>
                            <td className={tdCenterCls}>
                              <div className="flex gap-[10px] justify-center">
                                <EditIconButton onClick={() => setEditingMaterialIds((prev) => toggleInArray(prev, m.id))} active={isEditing} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {materials.length === 0 && (
                        <tr><td colSpan={5} className="p-[14px] text-center text-[#94a3b8]">Chưa có chất liệu nào</td></tr>
                      )}
                      {addingMaterial && (
                        <tr className={pcpAddRowCls}>
                          <td className={tdCls}><input autoFocus value={newMaterial.name} onChange={(e) => setNewMaterial((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="VD: Vàng 16K" /></td>
                          <td className={tdCls}>
                            <select value={newMaterial.baseMetalId} onChange={(e) => setNewMaterial((s) => ({ ...s, baseMetalId: e.target.value }))} className={inputCls}>
                              <option value="">— Phi kim loại —</option>
                              {baseMetals.filter((bm) => bm.isActive).map((bm) => (
                                <option key={bm.id} value={bm.id}>{bm.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className={tdCls}><input type="number" className={clsx(numInputCls, inputCls)} min={0} max={1000} step="0.001" value={newMaterial.priceRatioPct} onChange={(e) => setNewMaterial((s) => ({ ...s, priceRatioPct: e.target.value }))} /></td>
                          <td className={tdCls}>
                            <select value={newMaterial.pricingFormulaId} onChange={(e) => setNewMaterial((s) => ({ ...s, pricingFormulaId: e.target.value }))} className={inputCls}>
                              {formulas.length === 0 && <option value="">Chưa có công thức</option>}
                              {formulas.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className={tdCenterCls}>
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
                      className="hidden"
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
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importing} className={clsx(btnGhostSmallCls, importing && 'opacity-60')}>
                      {importing ? <Loader2 size={12} className="animate-[spin_0.8s_linear_infinite]" /> : <Upload size={12} />} Nhập Excel
                    </button>
                  </>
                }
              >
                {stoneError && (
                  <ErrorBanner message={stoneError} className="mb-[12px] whitespace-pre-line max-h-[160px] overflow-y-auto" />
                )}
                {importResult && <div className="mb-[12px] text-[#16a34a] text-[12px] font-bold">{importResult}</div>}

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

                <div className="h-[22px]" />

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
            <div className="grid [grid-template-columns:minmax(0,3fr)_minmax(280px,2fr)] max-[760px]:![grid-template-columns:1fr] gap-[20px] items-start py-[22px] px-0">
            <div className="flex flex-col gap-[20px]">
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
                        className={btnGhostSmallCls}
                      >
                        <Plus size={12} /> {f.formulaType === 'MULTIPLIER' ? 'Thêm hệ số' : 'Thêm bậc'}
                      </button>
                    }
                  >
                    {f.formulaType === 'MULTIPLIER' ? (
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse text-[12.5px]">
                          <thead>
                            <tr className={tableHeadRowCls}>
                              <th className={clsx(thCls, 'w-[60px]')}>STT</th>
                              <th className={thCls}>Hệ số nhân</th>
                              <th className={clsx(thCls, 'w-[90px] text-right')}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(f.config.multipliers || []).map((mult, idx) => {
                              const multError = mult < 0 ? 'Không được âm' : null;
                              return (
                                <tr key={idx} className="border-b border-[#f1f5f9]">
                                  <td className={clsx(tdCls, 'text-[#94a3b8] font-bold')}>{idx + 1}</td>
                                  <td className={tdCls}>
                                    {isEditing ? (
                                      <div className="flex flex-col gap-[2px]">
                                        <input type="number" className={clsx(numInputCls, inputCls, '!w-[100px]', multError ? 'border-[#dc2626]' : 'border-[#cbd5e1]')} min={0} step="0.1" value={mult} onChange={(e) => updateMultiplier(f.id, idx, Math.max(0, parseFloat(e.target.value) || 0))} />
                                        {multError && <span className={fieldErrorCls}>{multError}</span>}
                                      </div>
                                    ) : (
                                      <span className={clsx(valueBoxCls, 'font-extrabold text-[#0f172a]')}>{mult}</span>
                                    )}
                                  </td>
                                  <td className={clsx(tdCls, 'text-right')}>
                                    <div className="flex gap-[10px] justify-end">
                                      <EditIconButton onClick={() => setEditingFormulaIds((prev) => toggleInArray(prev, f.id))} active={isEditing} />
                                      <DeleteIconButton onClick={() => removeMultiplier(f.id, idx)} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {(f.config.multipliers || []).length === 0 && (
                              <tr><td colSpan={3} className="p-[14px] text-center text-[#94a3b8]">Chưa có hệ số nào</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse text-[12.5px]">
                          <thead>
                            <tr className={tableHeadRowCls}>
                              <th className={clsx(thCls, 'w-[42%]')}>Chi phí tối đa (VNĐ)</th>
                              <th className={clsx(thCls, 'w-[38%]')}>Biên độ lợi nhuận (%)</th>
                              <th className={clsx(thCls, 'w-[90px] text-right')}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(f.config.tiers || []).map((tier, idx) => {
                              const marginPct = parseFloat(tier.margin) || 0;
                              const pctError = marginPctError(marginPct);
                              const isUnlimited = tier.maxCost >= UNLIMITED_MAX_COST;
                              return (
                                <tr key={idx} className="border-b border-[#f1f5f9]">
                                  <td className={tdCls}>
                                    {isEditing ? (
                                      <div className="flex items-center gap-[8px]">
                                        <label className="flex items-center gap-[4px] text-[10px] text-[#6b7280] font-bold cursor-pointer shrink-0 whitespace-nowrap">
                                          <input type="checkbox" checked={isUnlimited} onChange={(e) => updateTier(f.id, idx, { maxCost: e.target.checked ? UNLIMITED_MAX_COST : 0 })} />
                                          Không giới hạn
                                        </label>
                                        {!isUnlimited && <MoneyField value={tier.maxCost} onChange={(v) => updateTier(f.id, idx, { maxCost: v })} />}
                                      </div>
                                    ) : (
                                      isUnlimited ? <span className={clsx(valueBoxCls, 'font-extrabold text-[#0f172a] text-[14px]')}>Không giới hạn</span> : <ValueDisplay value={tier.maxCost} unit="VNĐ" />
                                    )}
                                  </td>
                                  <td className={tdCls}>
                                    {isEditing ? (
                                      <PercentField value={marginPct} onChange={(pct) => updateTier(f.id, idx, { margin: `${pct}%`, divisor: (100 - pct) / 100 })} error={pctError} width="140px" />
                                    ) : (
                                      <ValueDisplay value={marginPct} unit="%" />
                                    )}
                                  </td>
                                  <td className={clsx(tdCls, 'text-right')}>
                                    <div className="flex gap-[10px] justify-end">
                                      <EditIconButton onClick={() => setEditingFormulaIds((prev) => toggleInArray(prev, f.id))} active={isEditing} />
                                      <DeleteIconButton onClick={() => removeTier(f.id, idx)} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {(f.config.tiers || []).length === 0 && (
                              <tr><td colSpan={3} className="p-[14px] text-center text-[#94a3b8]">Chưa có bậc lợi nhuận nào</td></tr>
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
                  <div className="flex flex-col gap-[10px] max-w-[360px]">
                    <input autoFocus value={newFormula.name} onChange={(e) => setNewFormula((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="VD: Bậc lợi nhuận Bạch kim cao cấp" />
                    <select value={newFormula.formulaType} onChange={(e) => setNewFormula((s) => ({ ...s, formulaType: e.target.value as PricingFormulaType }))} className={inputCls}>
                      <option value="MARGIN_TIERS">Bậc lợi nhuận theo chi phí</option>
                      <option value="MULTIPLIER">Hệ số nhân cố định</option>
                    </select>
                    <div className="flex gap-[10px]">
                      <button type="button" onClick={handleAddFormula} className={btnPrimaryCls}><Check size={13} /> Thêm</button>
                      <button type="button" onClick={() => setAddingFormula(false)} className={btnSecondaryCls}><X size={13} /> Hủy</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setFormulaError(null); setAddingFormula(true); }} className={btnGhostSmallCls}><Plus size={12} /> Thêm công thức</button>
                )}
              </RuleCard>
            </div>

            {/* Tiền công / VAT theo danh mục sản phẩm — panel riêng bên phải, gọn, giống ảnh mockup */}
            <div className="border border-[#e5e7eb] rounded-[12px] p-[18px]">
              <div className="flex items-start justify-between mb-[14px]">
                <div className="flex items-center gap-[8px]">
                  <Wrench size={15} className="text-[#64748b] shrink-0" />
                  <div>
                    <h3 className="text-[13.5px] font-extrabold text-[#0f172a] m-0">Tiền công / VAT</h3>
                    <p className="text-[11px] text-[#94a3b8] m-0 mt-[2px]">Theo danh mục sản phẩm</p>
                  </div>
                </div>
                <button type="button" onClick={() => setAddingCategory(true)} className={clsx(pcpIconBtnCls, pcpIconBtnEditCls)} title="Thêm danh mục">
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
                      <div className="py-[10px] px-0 text-center text-[#94a3b8] text-[12px]">Chưa có danh mục sản phẩm nào</div>
                    )}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-end gap-[8px] mt-[12px]">
                        <button type="button" onClick={() => setCategoryPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className={pageBtnCls(safePage <= 1)}>‹</button>
                        <span className="text-[11px] font-bold text-[#64748b]">{safePage}/{totalPages}</span>
                        <button type="button" onClick={() => setCategoryPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className={pageBtnCls(safePage >= totalPages)}>›</button>
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
        <div className="sticky -bottom-[20px] -mx-[20px] -mb-[20px] py-[14px] px-[22px] bg-surface border-t border-[#e5e7eb] rounded-b-[16px] flex justify-end gap-[10px]">
          <button type="button" onClick={handleCancelAll} className={btnSecondaryCls}>
            <RotateCcw size={13} /> Hủy bỏ
          </button>
          {(() => {
            const isSaveDisabled = saving || !hasPendingChanges || hasValidationError;
            return (
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaveDisabled}
                title={hasValidationError ? 'Còn field lỗi, sửa trước khi lưu' : undefined}
                className={clsx(
                  btnPrimaryCls,
                  saved && 'bg-[#f0fdf4] border-[#bbf7d0] text-[#15803d]',
                  isSaveDisabled ? 'cursor-default' : 'cursor-pointer',
                  (!saving && isSaveDisabled) && 'opacity-50',
                )}
              >
                {saving ? <Loader2 size={13} className="animate-[spin_0.8s_linear_infinite]" /> : <Save size={13} />}
                {saved ? 'Đã lưu!' : saving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            );
          })()}
        </div>
      </div>

      {/* Toast thông báo lưu thành công/lỗi */}
      {toast && (
        <div
          className={clsx(
            'fixed bottom-[20px] right-[20px] z-50 flex items-center gap-[8px] py-[12px] px-[16px] rounded-[10px] shadow-[0_10px_25px_rgba(0,0,0,0.18)] text-surface text-[12.5px] font-bold max-w-[360px]',
            toast.type === 'success' ? 'bg-[#16a34a]' : 'bg-[#dc2626]',
          )}
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
    <div className="flex flex-col">
      {items.map((c) => {
        const original = initialCategories.find((o) => o.id === c.id);
        const markedDelete = pendingDeleteIds.includes(c.id);
        const isDirty = !markedDelete && !!original && ((original.laborCost || 0) !== (c.laborCost || 0) || (original.vatRate || 0) !== (c.vatRate || 0));
        const isEditing = editingIds.includes(c.id);
        return (
          <div key={c.id} className={clsx('flex flex-col gap-[6px] py-[9px] px-0 border-b border-[#f1f5f9]', markedDelete ? 'bg-[#fef2f2]' : isDirty ? 'bg-[#fffbeb]' : '')}>
            <div className="flex items-center justify-between gap-[8px]">
              <span className={clsx('text-[12.5px] font-bold', markedDelete ? 'text-[#94a3b8] line-through' : 'text-[#334155]')}>{c.name}</span>
              <div className="flex items-center gap-[6px] shrink-0">
                <EditIconButton onClick={() => onToggleEdit(c.id)} active={isEditing} title={markedDelete ? undefined : (isEditing ? 'Đóng sửa' : 'Sửa')} />
                <DeleteIconButton onClick={() => onToggleDelete(c.id)} marked={markedDelete} />
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <div className="flex-1">
                <label className="text-[9.5px] text-[#94a3b8] font-bold block mb-[2px]">Tiền công</label>
                {isEditing && !markedDelete ? (
                  <MoneyField value={c.laborCost || 0} onChange={(v) => onLaborCostChange(c.id, v)} width="100%" />
                ) : (
                  <span className={clsx(valueBoxCls, 'block w-full box-border text-[12.5px] font-extrabold', isDirty ? 'text-[#b45309]' : 'text-[#0f172a]')}>{formatNumberVN(c.laborCost || 0)}</span>
                )}
              </div>
              <div className="w-[70px] shrink-0">
                <label className="text-[9.5px] text-[#94a3b8] font-bold block mb-[2px]">VAT</label>
                {isEditing && !markedDelete ? (
                  <PercentField value={c.vatRate || 0} onChange={(v) => onVatRateChange(c.id, v)} width="100%" />
                ) : (
                  <span className={clsx(valueBoxCls, 'text-[12.5px] font-extrabold', isDirty ? 'text-[#b45309]' : 'text-[#0f172a]')}>{c.vatRate || 0}%</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {items.length === 0 && !adding && (
        <div className="py-[10px] px-0 text-center text-[#cbd5e1] text-[12px]">—</div>
      )}
      {adding && (
        <div className={clsx(pcpAddRowCls, 'flex flex-col gap-[8px] p-[10px] rounded-[8px] mt-[8px]')}>
          <input autoFocus value={newCategory.name} onChange={(e) => setNewCategory((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Tên danh mục" />
          <div className="flex gap-[8px]">
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
// Bảng đá theo loại (Đá Chủ / Đá Tấm) — hiển thị đồng thời cả hai
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
      <h4 className="text-[12px] font-extrabold text-[#334155] m-0 mb-[8px]">{title}</h4>
      <div className="overflow-x-auto border border-[#e5e7eb] rounded-[10px]">
        <table className="w-full table-fixed border-collapse text-[12.5px]">
          <thead>
            <tr className={tableHeadRowCls}>
              <th className={clsx(thCls, 'w-[26%]')}>Tên đá</th>
              <th className={clsx(thCls, 'w-[18%]')}>Giác cắt</th>
              <th className={clsx(thCls, 'w-[15%]')}>Size (mm)</th>
              <th className={clsx(thCls, 'w-[26%]')}>Giá (VNĐ)</th>
              <th className={clsx(thCls, 'w-[90px] text-center')}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => {
              const original = initialStones.find((o) => o.id === s.id);
              const markedDelete = pendingDeleteIds.includes(s.id);
              const isDirty = !markedDelete && !!original && original.price !== s.price;
              const isEditing = editingIds.includes(s.id);
              return (
                <tr key={s.id} className={clsx('border-b border-[#f1f5f9]', markedDelete ? 'bg-[#fef2f2]' : isDirty ? 'bg-[#fffbeb]' : '')}>
                  <td className={clsx(tdCls, 'font-extrabold', markedDelete ? 'line-through text-[#94a3b8]' : 'text-[#0f172a]')}>{s.name}</td>
                  <td className={clsx(tdCls, markedDelete && 'text-[#94a3b8]')}>{s.cut || '—'}</td>
                  <td className={clsx(tdCls, markedDelete && 'text-[#94a3b8]')}>{s.size || '—'}</td>
                  <td className={tdCls}>
                    {isEditing && !markedDelete ? (
                      <MoneyField value={s.price} onChange={(v) => onPriceChange(s.id, v)} width="160px" />
                    ) : (
                      <ValueDisplay value={s.price} dirty={isDirty} />
                    )}
                  </td>
                  <td className={tdCenterCls}>
                    <div className="flex gap-[10px] justify-center">
                      <EditIconButton onClick={() => onToggleEdit(s.id)} active={isEditing} />
                      <DeleteIconButton onClick={() => onToggleDelete(s.id)} marked={markedDelete} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !adding && (
              <tr><td colSpan={5} className="p-[14px] text-center text-[#94a3b8]">Chưa có đá nào</td></tr>
            )}
            {adding && (
              <tr className={pcpAddRowCls}>
                <td className={tdCls}><input autoFocus value={newStone.name} onChange={(e) => setNewStone((s) => ({ ...s, name: e.target.value }))} className={inputCls} placeholder="Tên đá" /></td>
                <td className={tdCls}><input value={newStone.cut} onChange={(e) => setNewStone((s) => ({ ...s, cut: e.target.value }))} className={inputCls} placeholder="Giác cắt" /></td>
                <td className={tdCls}><input value={newStone.size} onChange={(e) => setNewStone((s) => ({ ...s, size: e.target.value }))} className={inputCls} placeholder="Size" /></td>
                <td className={tdCls}><MoneyField value={parseFloat(newStone.price) || 0} onChange={(v) => setNewStone((s) => ({ ...s, price: String(v) }))} width="160px" /></td>
                <td className={tdCenterCls}>
                  <ConfirmCancelButtons onConfirm={onConfirmAdd} onCancel={onCloseAdd} />
                </td>
              </tr>
            )}
          </tbody>
          {!adding && (
            <tfoot>
              <tr className={pcpAddRowCls}>
                <td colSpan={5} className="p-[8px]">
                  <button type="button" onClick={onOpenAdd} className="text-[#64748b] hover:text-primary flex items-center justify-center gap-[6px] w-full bg-transparent border-0 cursor-pointer text-[12px] font-bold p-[4px]">
                    <Plus size={13} /> {addLabel}
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {items.length > STONE_PAGE_SIZE && (
        <div className="flex items-center justify-end gap-[8px] mt-[10px]">
          <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className={pageBtnCls(safePage <= 1)}>‹</button>
          <span className="text-[11.5px] font-bold text-[#64748b]">Trang {safePage}/{totalPages}</span>
          <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className={pageBtnCls(safePage >= totalPages)}>›</button>
        </div>
      )}
    </div>
  );
};
