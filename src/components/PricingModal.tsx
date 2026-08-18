import React, { useState, useEffect, useRef } from 'react';
import { X, Calculator, Plus, Trash2, CheckCircle, Settings, Save } from 'lucide-react';
import type { QuoteOption, QuoteRequest } from '../types';
import { generatePricingOptionsApi, fetchPricingConfig, updatePricingConfig, fetchStones, fetchSilverMultipliers } from '../services/api';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';

type StoneCatalogItem = { id: string; stoneType: 'MAIN' | 'SIDE'; name: string; cut?: string; size?: string; price: number };

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: number, vat: number, options?: QuoteOption[]) => Promise<void>;
  onOpenCalculator?: () => void;
  selectedReq?: QuoteRequest | null;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenCalculator,
  selectedReq,
}) => {
  const [vat, setVat] = useState(String(PRICING_DEFAULTS.VAT_PCT));
  const [includeVat, setIncludeVat] = useState(false);
  const [manualBasePrice, setManualBasePrice] = useState<string>(String(PRICING_DEFAULTS.MANUAL_BASE_PRICE));
  const [submitting, setSubmitting] = useState(false);

  // 1. Basic calculation inputs for Gold / Silver auto generator
  const [weightChi, setWeightChi] = useState<string>(PRICING_DEFAULTS.WEIGHT_CHI);
  // Tiền công/VAT là cấu hình chuẩn lưu DB (PricingConfig) — mặc định khóa, bấm "Cấu hình" mới sửa được
  const [laborCost, setLaborCost] = useState<string>(String(PRICING_DEFAULTS.LABOR_COST));
  const [isEditingCostConfig, setIsEditingCostConfig] = useState(false);
  const [savingCostConfig, setSavingCostConfig] = useState(false);
  const [savedCostConfig, setSavedCostConfig] = useState(false);
  const [costConfigError, setCostConfigError] = useState<string | null>(null);
  const [stoneCost, setStoneCost] = useState<string>(String(PRICING_DEFAULTS.STONE_COST));
  const [stoneDesc, setStoneDesc] = useState<string>('');
  const [stoneCatalog, setStoneCatalog] = useState<StoneCatalogItem[]>([]);
  const [silverMultipliers, setSilverMultipliers] = useState<number[]>([]);
  const [selectedSilverMultiplier, setSelectedSilverMultiplier] = useState<number>(3);

  // 2. Options List & Material Detection
  const [options, setOptions] = useState<QuoteOption[]>([]);

  // Extract Sale's requested material name
  const requestedMatName = selectedReq?.materials?.[0]?.name || selectedReq?.material?.name || '';
  const reqLower = requestedMatName.toLowerCase();

  const isGoldReq = reqLower.includes('vàng') || reqLower.includes('gold');
  const isSilverReq = reqLower.includes('bạc') || reqLower.includes('silver');
  const isNonPrecious = requestedMatName ? (!isGoldReq && !isSilverReq) : false;

  // Sync prefilled quotedPrice if available
  useEffect(() => {
    if (isOpen && selectedReq?.quotedPrice) {
      setManualBasePrice(String(selectedReq.quotedPrice));
    }
  }, [isOpen, selectedReq?.quotedPrice]);

  // Load danh mục đá (đá chủ/đá tấm) mỗi lần mở modal
  useEffect(() => {
    if (!isOpen) return;
    fetchStones()
      .then((rows: StoneCatalogItem[]) => {
        setStoneCatalog(Array.isArray(rows) ? rows : []);
        if (Array.isArray(rows) && rows.length > 0 && !stoneDesc) setStoneDesc(rows[0].name);
      })
      .catch((err) => console.error('Lỗi tải danh mục đá:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Load VAT chuẩn từ PricingConfig mỗi lần mở modal
  useEffect(() => {
    if (!isOpen) return;
    fetchPricingConfig()
      .then((config: any) => {
        if (typeof config?.defaultVatRate === 'number') setVat(String(config.defaultVatRate));
      })
      .catch((err) => console.error('Lỗi tải cấu hình VAT chuẩn:', err));
  }, [isOpen]);

  // Danh sách hệ số nhân Bạc mỗi lần mở modal
  useEffect(() => {
    if (!isOpen) return;
    fetchSilverMultipliers()
      .then((list) => {
        setSilverMultipliers(list);
        if (list.length > 0) setSelectedSilverMultiplier(list[0]);
      })
      .catch((err) => console.error('Lỗi tải hệ số nhân Bạc:', err));
  }, [isOpen]);

  const handleSaveCostConfig = async () => {
    setSavingCostConfig(true);
    setCostConfigError(null);
    try {
      await updatePricingConfig({ defaultVatRate: parseFloat(vat) || 0 });
      setSavedCostConfig(true);
      setIsEditingCostConfig(false);
      setTimeout(() => setSavedCostConfig(false), 1500);
    } catch (err: any) {
      setCostConfigError(err.message || 'Lưu cấu hình thất bại');
    } finally {
      setSavingCostConfig(false);
    }
  };

  // Sync non-precious manual price mode
  useEffect(() => {
    if (isNonPrecious) {
      const baseP = parseFloat(manualBasePrice) || 0;
      const vatPercent = includeVat ? (parseFloat(vat) || 10) : 0;
      const finalPrice = includeVat ? Math.round(baseP * (1 + vatPercent / 100)) : baseP;

      setOptions([
        {
          optionName: `Phương án 1 (${requestedMatName} - SALE YÊU CẦU)`,
          materialName: requestedMatName,
          weightChi: 0,
          laborCost: baseP,
          stoneCost: 0,
          stoneDescription: '',
          vat: includeVat ? vatPercent : 0,
          quotedPrice: finalPrice,
          isSelected: true,
          note: includeVat
            ? `Giá gốc ${formatCurrency(baseP)} + VAT ${vatPercent}%`
            : `Giá gốc ${formatCurrency(baseP)} (Không VAT)`,
        },
      ]);
    }
  }, [manualBasePrice, includeVat, vat, requestedMatName, isNonPrecious]);

  // Delegate option generation 100% to Backend API (No FE calculation formulas)
  const generateKaratOptions = async () => {
    if (isNonPrecious) return;

    try {
      const generated = await generatePricingOptionsApi({
        requestedMatName,
        weightChi: parseFloat(weightChi) || 0,
        laborCost: parseFloat(laborCost) || 0,
        stoneCost: parseFloat(stoneCost) || 0,
        stoneDesc,
        vatRate: parseFloat(vat) || 10,
        includeVat,
        manualBasePrice: parseFloat(manualBasePrice) || 0,
        silverMultiplier: isSilverReq ? selectedSilverMultiplier : undefined,
      });

      if (Array.isArray(generated) && generated.length > 0) {
        // Bỏ "(Áp dụng X%)" khỏi tên hiển thị, chỉ còn "Phương án chính/phụ (chất liệu)"
        const cleaned = generated.map((opt: QuoteOption) => {
          const cleanMat = (opt.materialName || '').replace(/\s*\(Áp dụng[^)]*\)/gi, '').trim();
          return {
            ...opt,
            materialName: cleanMat,
            optionName: opt.isSelected ? `Phương án chính (${cleanMat})` : `Phương đề xuất (${cleanMat})`,
          };
        });
        setOptions(cleaned);
      }
    } catch (err) {
      console.error('Lỗi khi gọi API tính giá từ Backend:', err);
    }
  };

  // Real-time khi nhập liệu — debounce 500ms sau lần gõ cuối để khỏi spam API trên từng phím gõ
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen || isNonPrecious) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      generateKaratOptions();
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, requestedMatName, isNonPrecious, weightChi, laborCost, stoneCost, vat, stoneDesc, selectedSilverMultiplier]);

  if (!isOpen) return null;

  const vatVal = includeVat ? (parseFloat(vat) || 10) : 0;
  const baseP = parseFloat(manualBasePrice) || 0;
  const calculatedFinalPrice = includeVat ? Math.round(baseP * (1 + vatVal / 100)) : baseP;

  const handleAddCustomOption = () => {
    const nextIdx = options.length + 1;
    setOptions((prev) => [
      ...prev,
      {
        optionName: `Phương án ${nextIdx} (Tùy chỉnh thêm)`,
        materialName: requestedMatName || 'Chất liệu khác',
        weightChi: 0,
        laborCost: baseP,
        stoneCost: 0,
        stoneDescription: '',
        vat: vatVal,
        quotedPrice: baseP,
        isSelected: false,
        note: 'Tùy chỉnh phương án báo giá',
      },
    ]);
  };

  const handleOptionChange = (index: number, field: keyof QuoteOption, value: any) => {
    setOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? { ...opt, [field]: value } : opt))
    );
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 1) {
      alert('Phải giữ lại ít nhất 1 phương án báo giá!');
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (options.length === 0) {
      alert('Vui lòng tạo ít nhất 1 phương án báo giá!');
      return;
    }

    const selectedOpt = options.find((o) => o.isSelected) || options[0];
    const primaryPrice = selectedOpt.quotedPrice;

    setSubmitting(true);
    try {
      await onSubmit(primaryPrice, vatVal, options);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chốt phương án báo giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-card" style={{ maxWidth: '820px', width: '94%' }}>
        <div className="modal-header" style={{ background: '#1e293b' }}>
          <h2>Báo Giá Sản Phẩm </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Banner */}
            {requestedMatName && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', color: '#1e293b', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#475569" />
                <span>Chất liệu Sale yêu cầu chính: <strong style={{ color: '#0f172a' }}>{requestedMatName}</strong></span>
              </div>
            )}

            {/* IF NON-PRECIOUS (Gỗ, Inox, Titan, Da...): SHOW MANUAL PRICE FORM & VAT OPTION */}
            {isNonPrecious ? (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                  Báo Giá Trực Tiếp — Chất Liệu: {requestedMatName}
                </div>

                <div className="modal-grid-2col" style={{ alignItems: 'center' }}>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Giá Sản Phẩm Gốc (₫):
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      value={formatNumberVN(manualBasePrice)}
                      onChange={(e) => setManualBasePrice(e.target.value.replace(/\D/g, ''))}
                      placeholder="Nhập giá gốc sản phẩm (VD: 1.200.000)"
                      style={{ padding: '8px 12px', fontSize: '13.5px', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '18px' }}>
                    <label style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={includeVat}
                        onChange={(e) => setIncludeVat(e.target.checked)}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: '#1e293b' }}
                      />
                      Cần tính Thuế VAT (+10%)
                    </label>
                  </div>
                </div>

                {includeVat && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 700, fontSize: '12px', color: '#475569' }}>Thuế VAT (%):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={vat}
                      onChange={(e) => setVat(e.target.value)}
                      style={{ width: '90px', padding: '4px 8px', fontSize: '12.5px' }}
                    />
                  </div>
                )}

                <div style={{ marginTop: '14px', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    {includeVat
                      ? `Giá Gốc (${formatCurrency(baseP)}) + VAT ${vatVal}% (${formatCurrency(calculatedFinalPrice - baseP)})`
                      : 'Giá Gốc Trực Tiếp (Khách Không Lấy VAT)'}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
                    Tổng Báo Khách: {formatCurrency(calculatedFinalPrice)}
                  </span>
                </div>
              </div>
            ) : (
              /* IF GOLD OR SILVER: SHOW AUTO-CALCULATOR FORM */
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={15} color="#475569" /> Tính & Tạo Phương Án Báo Giá: {isGoldReq ? 'Tất cả tuổi Vàng' : 'Các loại Bạc'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditingCostConfig ? (
                      <button
                        type="button"
                        onClick={handleSaveCostConfig}
                        disabled={savingCostConfig || savedCostConfig}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: savedCostConfig ? '#16a34a' : '#0f172a', border: 'none', color: '#ffffff',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700,
                          cursor: (savingCostConfig || savedCostConfig) ? 'default' : 'pointer',
                        }}
                      >
                        {savedCostConfig ? <><CheckCircle size={13} /> Đã lưu!</> : <><Save size={13} /> {savingCostConfig ? 'Đang lưu...' : 'Lưu'}</>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditingCostConfig(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f3f3f3', border: '1px solid #a3a3a3', color: '#000000', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Settings size={13} /> Cấu hình
                      </button>
                    )}
                    {onOpenCalculator && (
                      <button
                        type="button"
                        onClick={onOpenCalculator}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <Calculator size={13} /> Mở Máy Tính Giá
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Trọng lượng (chỉ):</label>
                    <input type="number" step="0.01" className="form-control" value={weightChi} onChange={(e) => setWeightChi(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Tiền công (₫):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      value={formatNumberVN(laborCost)}
                      onChange={(e) => setLaborCost(e.target.value.replace(/\D/g, ''))}
                      style={{ padding: '6px 8px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Tiền đá (₫):</label>
                    <input type="text" inputMode="numeric" className="form-control" value={formatNumberVN(stoneCost)} onChange={(e) => setStoneCost(e.target.value.replace(/\D/g, ''))} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Loại đá đính:</label>
                    <select className="form-control" value={stoneDesc} onChange={(e) => setStoneDesc(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }}>
                      <option value="">-- Chọn đá --</option>
                      <optgroup label="Đá chủ">
                        {stoneCatalog.filter((s) => s.stoneType === 'MAIN').map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Đá tấm">
                        {stoneCatalog.filter((s) => s.stoneType === 'SIDE').map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Cộng VAT (%):</label>
                    <input
                      type="number"
                      className="form-control"
                      value={vat}
                      onChange={(e) => setVat(e.target.value)}
                      disabled={!isEditingCostConfig}
                      style={{ padding: '6px 8px', fontSize: '12.5px', background: isEditingCostConfig ? '#ffffff' : '#f1f5f9', color: isEditingCostConfig ? '#0f172a' : '#64748b', cursor: isEditingCostConfig ? 'text' : 'not-allowed' }}
                    />
                  </div>
                  {isSilverReq && (
                    <div>
                      <label style={{ fontWeight: 700, color: '#334155' }}>Hệ số nhân Bạc:</label>
                      <select className="form-control" value={selectedSilverMultiplier} onChange={(e) => setSelectedSilverMultiplier(parseFloat(e.target.value) || 0)} style={{ padding: '6px 8px', fontSize: '12.5px' }}>
                        {silverMultipliers.map((m) => (
                          <option key={m} value={m}>× {m}</option>
                        ))}
                        {silverMultipliers.length === 0 && <option value={3}>× 3</option>}
                      </select>
                    </div>
                  )}
                </div>

                {costConfigError && (
                  <div style={{ marginTop: '8px', color: '#b91c1c', fontSize: '11.5px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px' }}>
                     {costConfigError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                      generateKaratOptions();
                    }}
                    style={{ background: 'var(--primary)', color: '#ffffff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Tính & Tạo Lại Tất Cả Phương Án
                  </button>
                </div>
              </div>
            )}

            {/* Render Multi-Options Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  Danh Sách Phương Án Báo Giá ({options.length} phương án)
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomOption}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Thêm Phương Án Khác
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {options.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: opt.isSelected ? '#f0fdf4' : '#ffffff',
                      border: opt.isSelected ? '2px solid #22c55e' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={opt.optionName}
                        onChange={(e) => handleOptionChange(idx, 'optionName', e.target.value)}
                        style={{ fontWeight: opt.isSelected ? 900 : 700, fontSize: '13px', padding: '4px 8px', color: opt.isSelected ? '#15803d' : '#0f172a' }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={opt.materialName || ''}
                        placeholder="Chất liệu"
                        onChange={(e) => handleOptionChange(idx, 'materialName', e.target.value)}
                        style={{ fontSize: '12px', padding: '4px 8px' }}
                      />
                    </div>

                    <div style={{ flex: 1.5, minWidth: '130px' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="form-control"
                        value={formatNumberVN(opt.quotedPrice)}
                        onChange={(e) => handleOptionChange(idx, 'quotedPrice', parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                        style={{ fontWeight: 900, color: '#16a34a', fontSize: '13.5px', padding: '4px 8px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '14px' }}>
            <button type="button" className="tool-btn" onClick={onClose}>Hủy</button>
            <button
              type="submit"
              className="btn-insp-primary"
              style={{ width: 'auto', padding: '9px 18px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'var(--primary)', color: '#ffffff' }}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi...' : 'Xác Nhận Gửi Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
