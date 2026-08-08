import React, { useState, useMemo, useEffect } from 'react';
import type { Role } from '../types';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { MetalPricesSettingsModal } from './MetalPricesSettingsModal';
import { fetchPricingConfig, fetchMasterData } from '../services/api';
import {
  Calculator,
  PlusCircle,
  TrendingUp,
  RefreshCw,
  Settings,
  Coins,
} from 'lucide-react';
import { PRICING_DEFAULTS } from '../constants';

interface PricingCalculatorViewProps {
  currentRole: Role;
  onApplyToNewRequest?: (productData: any) => void;
}

export const PricingCalculatorView: React.FC<PricingCalculatorViewProps> = ({
  currentRole,
  onApplyToNewRequest,
}) => {
  // Master Data & DB Config
  const [dbConfig, setDbConfig] = useState<any>(null);
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string }[]>([]);

  // Product Inputs
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [weightChi, setWeightChi] = useState<string>(PRICING_DEFAULTS.WEIGHT_CHI);
  const [laborCost, setLaborCost] = useState<number>(PRICING_DEFAULTS.LABOR_COST);
  const [vatPct, setVatPct] = useState<number>(PRICING_DEFAULTS.VAT_PCT);

  // Stone Calculator
  type StoneUnit = 'vien' | 'carat';
  type StoneRow = {
    id: string;
    type: string;
    sizeDesc: string;
    qty: number;
    pricePerUnit: number;
    unit: StoneUnit;
  };
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);

  const addStoneRow = () => {
    const defaultType = dbMaterials.length > 0 ? dbMaterials[0].name : 'Kim Cương';
    setStoneRows((prev) => [
      ...prev,
      { id: Date.now().toString(), type: defaultType, sizeDesc: '', qty: 1, pricePerUnit: 0, unit: 'vien' },
    ]);
  };

  const updateStoneRow = (id: string, patch: Partial<StoneRow>) => {
    setStoneRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeStoneRow = (id: string) => {
    setStoneRows((prev) => prev.filter((r) => r.id !== id));
  };

  const stoneCost = stoneRows.reduce((sum, r) => sum + r.qty * r.pricePerUnit, 0);

  // Metal Prices
  const {
    prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices,
    formatted, apiFormatted, overrides: priceOverrides, saveOverrides, resetOverrides,
  } = useMetalPrices();

  const [showPriceSettings, setShowPriceSettings] = useState(false);

  const goldPrice24K = formatted.gold24k;
  const silverPrice = formatted.silver;

  const setGoldOverride = (val: string) => saveOverrides({ ...priceOverrides, gold: val });
  const setSilverOverride = (val: string) => saveOverrides({ ...priceOverrides, silver: val });

  const canViewCost = currentRole === 'PRICING' || currentRole === 'ADMIN';

  useEffect(() => {
    Promise.all([fetchPricingConfig(), fetchMasterData()])
      .then(([cfg, master]) => {
        setDbConfig(cfg);
        if (master?.categories && master.categories.length > 0) {
          setDbCategories(master.categories);
          setCategory(master.categories[0].id || master.categories[0].name);
        }
        if (master?.materials && master.materials.length > 0) {
          setDbMaterials(master.materials);
        }
      })
      .catch((err) => console.error('Lỗi nạp cấu hình:', err));
  }, []);

  const handleFormatInput = (val: string, setter: (v: string) => void) => {
    const raw = val.replace(/\D/g, '');
    setter(raw ? Number(raw).toLocaleString('vi-VN') : '');
  };

  // Unified Price Calculation (Gold & Silver)
  const calculationResult = useMemo(() => {
    const weightNum = parseFloat(weightChi) || 0;
    const gold24kRate = parseFloat(goldPrice24K.replace(/\D/g, '')) || prices.gold24kVnd || PRICING_DEFAULTS.FALLBACK_GOLD_24K;
    const silverRate = parseFloat(silverPrice.replace(/\D/g, '')) || prices.silverVnd || PRICING_DEFAULTS.FALLBACK_SILVER;
    const laborNum = laborCost || 0;
    const stoneNum = stoneCost || 0;
    const vatVal = vatPct || 0;

    let materialLabel = 'Vàng 18K';
    let materialCost = 0;
    let suggestedPrice = 0;

    if (materialType === 'SILVER') {
      materialLabel = 'Bạc (Silver)';
      materialCost = Math.round(silverRate * weightNum);
      const rawCost = materialCost + laborNum + stoneNum;
      const vatAmount = Math.round(rawCost * (vatVal / 100));
      const totalCostWithVat = rawCost + vatAmount;
      const silverMultiplier = dbConfig?.silverMultiplier ? Number(dbConfig.silverMultiplier) : PRICING_DEFAULTS.SILVER_MULTIPLIER;
      suggestedPrice = Math.round(totalCostWithVat * silverMultiplier);
    } else {
      let ratio = PRICING_DEFAULTS.GOLD_APPLIED_RATIO;
      const goldRatiosList = dbConfig?.goldRatios || [];

      const matchedRatioObj = goldRatiosList.find((r: any) => r.key === materialType);
      if (matchedRatioObj) {
        ratio = Number(matchedRatioObj.applied);
        materialLabel = matchedRatioObj.label || matchedRatioObj.key;
      }

      materialCost = Math.round(gold24kRate * ratio * weightNum);
      const rawCost = materialCost + laborNum + stoneNum;
      const vatAmount = Math.round(rawCost * (vatVal / 100));
      const totalCostWithVat = rawCost + vatAmount;

      const profitMarginsList = dbConfig?.profitMargins || [];

      const tier = profitMarginsList.find((m: any) => totalCostWithVat <= m.maxCost) || profitMarginsList[profitMarginsList.length - 1];
      const divisor = tier ? Number(tier.divisor) : PRICING_DEFAULTS.PROFIT_DIVISOR;

      suggestedPrice = Math.round(totalCostWithVat / divisor);

      return {
        materialLabel,
        materialCost,
        laborNum,
        stoneNum,
        rawCost,
        vatAmount,
        totalCostWithVat,
        divisor,
        marginPercentStr: `${Math.round((1 - divisor) * 100)}%`,
        suggestedPrice,
        isSilver: false,
      };
    }

    const rawCost = materialCost + laborNum + stoneNum;
    const vatAmount = Math.round(rawCost * (vatVal / 100));
    const totalCostWithVat = rawCost + vatAmount;

    return {
      materialLabel,
      materialCost,
      laborNum,
      stoneNum,
      rawCost,
      vatAmount,
      totalCostWithVat,
      divisor: 1,
      marginPercentStr: 'Bạc x3',
      suggestedPrice,
      isSilver: true,
    };
  }, [materialType, weightChi, laborCost, stoneCost, vatPct, goldPrice24K, silverPrice, dbConfig]);

  const formatVND = (num: number) => (num || 0).toLocaleString('vi-VN') + ' ₫';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Top Banner: Metal Prices */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '1px solid #fde68a', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 10px rgba(217, 119, 6, 0.06)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)' }}>
            <Coins size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              GIÁ VÀNG 24K HÔM NAY <TrendingUp size={13} color="#16a34a" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              {canViewCost ? (
                <input
                  type="text"
                  style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', border: 'none', background: 'transparent', width: '100%', outline: 'none', padding: 0 }}
                  value={goldPrice24K}
                  onChange={(e) => handleFormatInput(e.target.value, setGoldOverride)}
                />
              ) : (
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{goldPrice24K}</span>
              )}
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#b45309', flexShrink: 0 }}>₫ / chỉ</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #475569 0%, #334155 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(71, 85, 105, 0.2)' }}>
            <Calculator size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', letterSpacing: '0.5px' }}>GIÁ BẠC HÔM NAY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              {canViewCost ? (
                <input
                  type="text"
                  style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', border: 'none', background: 'transparent', width: '100%', outline: 'none', padding: 0 }}
                  value={silverPrice}
                  onChange={(e) => handleFormatInput(e.target.value, setSilverOverride)}
                />
              ) : (
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>{silverPrice}</span>
              )}
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', flexShrink: 0 }}>₫ / chỉ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metal Prices Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap', marginTop: '-10px' }}>
        <span>Cập nhật: {prices?.updatedAt ? new Date(prices.updatedAt).toLocaleString('vi-VN') : ''}</span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span style={{ color: '#94a3b8' }}>{prices?.source || ''}</span>
        {pricesError && <span style={{ color: '#ef4444', fontWeight: 700 }}>{pricesError}</span>}
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          {canViewCost && (
            <button onClick={refreshPrices} disabled={pricesLoading} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '11px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
              <RefreshCw size={11} style={pricesLoading ? { animation: 'spin 1s linear infinite' } : {}} /> Làm mới API
            </button>
          )}
          <button onClick={() => setShowPriceSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#eef2ff', fontSize: '11px', fontWeight: 700, color: '#4338ca', cursor: 'pointer' }}>
            <Settings size={11} /> Cài đặt giá kim loại
          </button>
        </div>
      </div>

      {/* Single Unified Calculator Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Inputs */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={20} color="#2563eb" /> Máy Tính Giá Trang Sức
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 0 0' }}>
              Nhập các thông số sản phẩm để tính ra giá bán lẻ đề xuất chuẩn
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Tên / Mẫu Sản Phẩm</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tên sản phẩm (vd: Nhẫn Nam Kim Cương...)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{ borderRadius: '10px', height: '42px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Danh Mục Sản Phẩm</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ borderRadius: '10px', height: '42px', fontWeight: 600 }}
              >
                <option value="">-- Chọn danh mục --</option>
                {dbCategories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.id || cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Unified Material Selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Chất Liệu Chế Tác <span className="req">*</span></label>
              <select
                className="form-control"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                style={{ borderRadius: '10px', height: '42px', fontWeight: 800 }}
              >
                <option value="">-- Chọn chất liệu --</option>
                {dbConfig?.goldRatios?.map((ratioObj: any) => (
                  <option key={ratioObj.key} value={ratioObj.key}>
                    {ratioObj.label || ratioObj.key}
                  </option>
                ))}
                <option value="SILVER">Bạc (Silver)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Trọng Lượng (Chỉ) <span className="req">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-control"
                value={weightChi}
                onChange={(e) => setWeightChi(e.target.value)}
                style={{ borderRadius: '10px', height: '42px', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Row 1: Tiền Công + Thuế VAT cùng dòng */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {canViewCost && (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Tiền Công Chế Tác (VNĐ)</label>
                <input
                  type="text"
                  className="form-control"
                  value={laborCost ? laborCost.toLocaleString('vi-VN') : ''}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                  style={{ borderRadius: '10px', height: '42px' }}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 800, fontSize: '12.5px', color: '#334155' }}>Thuế VAT (%)</label>
              <input
                type="number"
                className="form-control"
                value={vatPct}
                onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                style={{ borderRadius: '10px', height: '42px' }}
              />
            </div>
          </div>

          {/* Row 2: Tiền Đá Đính Kèm — full width */}
          {canViewCost && (
            <div className="form-group">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '12.5px', color: '#475569', margin: 0 }}>
                  Tiền Đá Đính Kèm
                  {stoneRows.length > 0 && (
                    <span style={{ marginLeft: '10px', fontWeight: 800, color: '#334155', fontSize: '13px' }}>
                      = {stoneCost.toLocaleString('vi-VN')} ₫
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={addStoneRow}
                  style={{
                    padding: '4px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
                    background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer',
                  }}
                >
                  + Thêm đá
                </button>
              </div>

              {/* Empty state */}
              {stoneRows.length === 0 && (
                <div
                  onClick={addStoneRow}
                  style={{
                    border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px',
                    textAlign: 'center', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', background: '#f8fafc',
                  }}
                >
                  Nhấn "+ Thêm đá" để nhập danh sách đá quý
                </div>
              )}

              {/* Stone cards */}
              {stoneRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stoneRows.map((row, idx) => (
                    <div
                      key={row.id}
                      style={{
                        border: '1px solid #e2e8f0', borderRadius: '8px',
                        padding: '10px 12px', background: '#fafafa',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}
                    >
                      {/* Row header: index + delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                          Đá #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStoneRow(row.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '11px', fontWeight: 600, padding: '0' }}
                        >
                          Xóa
                        </button>
                      </div>

                      {/* Line 1: Loại đá + Kích thước */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Loại đá</div>
                          <select
                            value={row.type}
                            onChange={(e) => updateStoneRow(row.id, { type: e.target.value })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px', fontWeight: 600, background: '#fff', color: '#334155' }}
                          >
                            {dbMaterials.map((m) => (
                              <option key={m.id || m.name} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                            {dbMaterials.length === 0 && <option value="Kim Cương">Kim Cương</option>}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Kích thước</div>
                          <input
                            type="text"
                            placeholder={row.unit === 'carat' ? 'vd: 0.5ct' : 'vd: 6.5mm'}
                            value={row.sizeDesc}
                            onChange={(e) => updateStoneRow(row.id, { sizeDesc: e.target.value })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px', background: '#fff', color: '#334155', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Line 2: SL + Giá/đv + Tính theo + Thành tiền */}
                      <div style={{ display: 'grid', gridTemplateColumns: '60px 1.4fr 1fr 1fr', gap: '8px', alignItems: 'end' }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Số lượng</div>
                          <input
                            type="number"
                            min={1}
                            value={row.qty}
                            onChange={(e) => updateStoneRow(row.id, { qty: parseInt(e.target.value) || 1 })}
                            style={{ width: '100%', padding: '5px 6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px', textAlign: 'center', background: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Đơn giá (VNĐ)</div>
                          <input
                            type="text"
                            placeholder="0"
                            value={row.pricePerUnit ? row.pricePerUnit.toLocaleString('vi-VN') : ''}
                            onChange={(e) => updateStoneRow(row.id, { pricePerUnit: parseInt(e.target.value.replace(/\D/g, '')) || 0 })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12.5px', background: '#fff', fontWeight: 700, boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Tính theo</div>
                          <select
                            value={row.unit}
                            onChange={(e) => updateStoneRow(row.id, { unit: e.target.value as StoneUnit })}
                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', background: '#fff', boxSizing: 'border-box' }}
                          >
                            <option value="vien">/ viên</option>
                            <option value="carat">/ carat</option>
                          </select>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '3px' }}>Thành tiền</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                            {(row.qty * row.pricePerUnit).toLocaleString('vi-VN')} ₫
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                      Tổng {stoneRows.length} loại đá — {stoneRows.reduce((s, r) => s + r.qty, 0)} viên
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#334155' }}>
                      {stoneCost.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Clean Result Summary Card (No formulas or verbose step annotations) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              KẾT QUẢ BÁO GIÁ SẢN PHẨM
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '4px 0 0 0' }}>
              {productName || 'Sản phẩm trang sức'}
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
              Chất liệu: <strong style={{ color: '#0f172a' }}>{calculationResult.materialLabel}</strong> | {weightChi || 0} chỉ
            </div>
          </div>

          {/* Detailed Cost Breakdown for ADMIN / PRICING */}
          {canViewCost ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calculator size={16} color="#2563eb" /> 📊 BẢNG CHI TIẾT CÔNG THỨC & GIÁ VỐN NGUYÊN LIỆU
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>1. Tiền Vàng / Bạc Gốc:</span>
                <strong style={{ color: '#0f172a' }}>{formatVND(calculationResult.materialCost)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>2. Tiền Công + Tiền Đá:</span>
                <strong style={{ color: '#0f172a' }}>{formatVND(calculationResult.laborNum + calculationResult.stoneNum)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>3. Chi Phí Gốc (Chưa VAT):</span>
                <strong style={{ color: '#0f172a' }}>{formatVND(calculationResult.rawCost)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>4. Cộng Thuế VAT (+{vatPct}%):</span>
                <strong style={{ color: '#2563eb' }}>+ {formatVND(calculationResult.vatAmount)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', borderTop: '1px solid #cbd5e1', paddingTop: '6px' }}>
                <span style={{ color: '#334155', fontWeight: 700 }}>5. Tổng Vốn Đã Có VAT:</span>
                <strong style={{ color: '#0f172a' }}>{formatVND(calculationResult.totalCostWithVat)}</strong>
              </div>

              {!calculationResult.isSilver && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '6px 10px', borderRadius: '6px', color: '#4338ca', fontWeight: 700 }}>
                  <span>Lợi nhuận công ty áp dụng:</span>
                  <span>Chia {calculationResult.divisor} ({calculationResult.marginPercentStr} margin)</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
              🔒 Chi tiết giá vốn & công thức được bảo mật theo quy định công ty.
            </div>
          )}

          {/* Clean Customer Selling Price Summary */}
<div style={{ background: 'linear-gradient(135deg, #e6f4ea 0%, #dcfce7 100%)', border: '1px solid #60ee94', borderRadius: '16px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 15px rgba(22, 163, 74, 0.1)' }}>
  <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              GIÁ BÁN LẺ ĐỀ XUẤT (ĐÃ GỒM VAT)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#78350f', marginTop: '6px' }}>
              {formatVND(calculationResult.suggestedPrice)}
            </div>
          </div>

          {onApplyToNewRequest && (
            <button
              type="button"
              onClick={() => onApplyToNewRequest({
                productName: productName || `Trang sức ${calculationResult.materialLabel}`,
                suggestedPrice: calculationResult.suggestedPrice,
              })}
              style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '14px 18px', fontSize: '14px', fontWeight: 800, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}
            >
              <PlusCircle size={18} color="#166534" /> Tạo Yêu Cầu Báo Giá Với Số Tiền Này
            </button>
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
        overrides={priceOverrides}
        apiFormatted={apiFormatted}
        onSave={saveOverrides}
        onReset={resetOverrides}
      />
    </div>
  );
};
