import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, Trash2, Sparkles, CheckCircle } from 'lucide-react';
import type { QuoteOption, QuoteRequest } from '../types';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { fetchPricingConfig } from '../services/api';

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
  const { formatted, prices } = useMetalPrices();
  const [vat, setVat] = useState('10');
  const [includeVat, setIncludeVat] = useState(false);
  const [manualBasePrice, setManualBasePrice] = useState<string>('1200000');
  const [submitting, setSubmitting] = useState(false);

  // 1. Basic calculation inputs for Gold / Silver auto generator
  const [weightChi, setWeightChi] = useState<string>('1.2');
  const [laborCost, setLaborCost] = useState<string>('500000');
  const [stoneCost, setStoneCost] = useState<string>('300000');
  const [stoneDesc, setStoneDesc] = useState<string>('Đá CZ cao cấp');

  // 2. Options List
  const [options, setOptions] = useState<QuoteOption[]>([]);
  const [goldRatios, setGoldRatios] = useState<any[]>([
    { key: 'GOLD_10K', applied: 0.47, label: 'Vàng 10K' },
    { key: 'GOLD_14K', applied: 0.64, label: 'Vàng 14K' },
    { key: 'GOLD_18K', applied: 0.80, label: 'Vàng 18K' },
    { key: 'GOLD_24K', applied: 1.05, label: 'Vàng 24K' },
    { key: 'GOLD_610', applied: 0.66, label: 'Vàng 610' },
  ]);
  const [profitMargins, setProfitMargins] = useState<any[]>([
    { maxCost: 10_000_000, divisor: 0.65 },
    { maxCost: 50_000_000, divisor: 0.70 },
    { maxCost: 999_999_999_999, divisor: 0.75 },
  ]);

  // Load dynamic DB pricing config
  useEffect(() => {
    if (isOpen) {
      fetchPricingConfig()
        .then((cfg) => {
          if (cfg.goldRatios && cfg.goldRatios.length > 0) setGoldRatios(cfg.goldRatios);
          if (cfg.profitMargins && cfg.profitMargins.length > 0) setProfitMargins(cfg.profitMargins);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Extract Sale's requested material name
  const requestedMatName = selectedReq?.materials?.[0]?.name || selectedReq?.material?.name || '';
  const reqLower = requestedMatName.toLowerCase();

  const isGoldReq =
    reqLower.includes('vàng') ||
    reqLower.includes('gold') ||
    reqLower.includes('10k') ||
    reqLower.includes('14k') ||
    reqLower.includes('18k') ||
    reqLower.includes('24k') ||
    reqLower.includes('610');
  const isSilverReq = reqLower.includes('bạc') || reqLower.includes('silver');
  const isNonPrecious = requestedMatName ? (!isGoldReq && !isSilverReq) : false;

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
            ? `Giá gốc ${baseP.toLocaleString('vi-VN')}₫ + VAT ${vatPercent}%`
            : `Giá gốc ${baseP.toLocaleString('vi-VN')}₫ (Không VAT)`,
        },
      ]);
    }
  }, [manualBasePrice, includeVat, vat, requestedMatName, isNonPrecious]);

  // Auto-generate options for Gold & Silver
  const generateKaratOptions = () => {
    if (isNonPrecious) return;

    const w = parseFloat(weightChi) || 0;
    const l = parseFloat(laborCost) || 0;
    const s = parseFloat(stoneCost) || 0;
    const vatVal = parseFloat(vat) || 10;

    const gold24kRate = parseFloat(formatted.gold24k.replace(/\D/g, '')) || prices.gold24kVnd || 13900000;
    const silverRate = parseFloat(formatted.silver.replace(/\D/g, '')) || prices.silverVnd || 1200000;

    // IF SALE REQUESTED SILVER (BẠC)
    if (isSilverReq) {
      const matCost = silverRate * w;
      const rawCost = matCost + l + s;
      const vatCost = rawCost * (vatVal / 100);
      const totalCostWithVat = rawCost + vatCost;
      const suggestedPrice = Math.round(totalCostWithVat * 3);

      const silverOptions: QuoteOption[] = [
        {
          optionName: `Phương án 1 (Bạc 925 - SALE YÊU CẦU)`,
          materialName: 'Bạc 925',
          weightChi: w,
          laborCost: l,
          stoneCost: s,
          stoneDescription: stoneDesc,
          vat: vatVal,
          quotedPrice: suggestedPrice,
          isSelected: true,
          note: `Chất liệu Sale yêu cầu | Công ${l.toLocaleString('vi-VN')}₫ | ${stoneDesc}`,
        },
        {
          optionName: `Phương án 2 (Bạc Xi Kim / Vàng Trắng - So sánh thêm)`,
          materialName: 'Bạc Xi Kim',
          weightChi: w,
          laborCost: l + 150000,
          stoneCost: s,
          stoneDescription: stoneDesc,
          vat: vatVal,
          quotedPrice: Math.round((totalCostWithVat + 150000) * 3),
          isSelected: false,
          note: `Phương án xi cao cấp | Công ${(l + 150000).toLocaleString('vi-VN')}₫`,
        },
      ];
      setOptions(silverOptions);
      return;
    }

    // IF SALE REQUESTED GOLD (VÀNG) OR DEFAULT
    let requestedKey = 'GOLD_10K';
    if (requestedMatName) {
      const found = goldRatios.find(
        (r) =>
          reqLower.includes(r.label.toLowerCase()) ||
          reqLower.includes(r.key.toLowerCase().replace('gold_', ''))
      );
      if (found) requestedKey = found.key;
    }

    const allGenerated = goldRatios.map((ratioObj) => {
      const matName = ratioObj.label || ratioObj.key;
      const isSaleTarget = ratioObj.key === requestedKey;
      const matCost = gold24kRate * ratioObj.applied * w;
      const rawCost = matCost + l + s;
      const vatCost = rawCost * (vatVal / 100);
      const totalCostWithVat = rawCost + vatCost;

      const tier = profitMargins.find((m) => totalCostWithVat <= m.maxCost) || profitMargins[profitMargins.length - 1];
      const divisor = tier ? tier.divisor : 0.7;
      const suggestedPrice = Math.round(totalCostWithVat / divisor);

      return {
        isSaleTarget,
        option: {
          optionName: isSaleTarget ? `Phương án chính (${matName} - SALE YÊU CẦU)` : `Phương án phụ (${matName} - So sánh thêm)`,
          materialName: matName,
          weightChi: w,
          laborCost: l,
          stoneCost: s,
          stoneDescription: stoneDesc,
          vat: vatVal,
          quotedPrice: suggestedPrice,
          isSelected: isSaleTarget,
          note: isSaleTarget ? `Đúng chất liệu Sale yêu cầu` : `Phương án phụ để Sale tư vấn so sánh`,
        } as QuoteOption,
      };
    });

    allGenerated.sort((a, b) => (b.isSaleTarget ? 1 : 0) - (a.isSaleTarget ? 1 : 0));

    const finalOptions = allGenerated.map((item, idx) => ({
      ...item.option,
      isSelected: idx === 0,
      optionName: item.isSaleTarget
        ? `Phương án ${idx + 1} (${item.option.materialName} - SALE YÊU CẦU)`
        : `Phương án ${idx + 1} (${item.option.materialName} - So sánh thêm)`,
    }));

    setOptions(finalOptions);
  };

  useEffect(() => {
    if (isOpen && !isNonPrecious) {
      generateKaratOptions();
    }
  }, [isOpen, requestedMatName, isNonPrecious]);

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

  const handleSelectDefaultOption = (index: number) => {
    setOptions((prev) =>
      prev.map((opt, idx) => ({ ...opt, isSelected: idx === index }))
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
          <h2>Báo Giá Sản Phẩm — {requestedMatName ? `Đơn Yêu Cầu: ${requestedMatName}` : 'Phương Án Giá Multi-Options'}</h2>
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

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontWeight: 700, fontSize: '12px', color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Giá Sản Phẩm Gốc (₫):
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={manualBasePrice}
                      onChange={(e) => setManualBasePrice(e.target.value)}
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
                      ? `Giá Gốc (${baseP.toLocaleString('vi-VN')}₫) + VAT ${vatVal}% (${(calculatedFinalPrice - baseP).toLocaleString('vi-VN')}₫)`
                      : 'Giá Gốc Trực Tiếp (Khách Không Lấy VAT)'}
                  </span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>
                    Tổng Báo Khách: {calculatedFinalPrice.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            ) : (
              /* IF GOLD OR SILVER: SHOW AUTO-CALCULATOR FORM */
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} color="#475569" /> Tính & Tạo Phương Án Báo Giá: {isGoldReq ? 'Tất cả tuổi Vàng' : 'Các loại Bạc'}
                  </span>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Trọng lượng (chỉ):</label>
                    <input type="number" step="0.01" className="form-control" value={weightChi} onChange={(e) => setWeightChi(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Tiền công (₫):</label>
                    <input type="number" className="form-control" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Tiền đá (₫):</label>
                    <input type="number" className="form-control" value={stoneCost} onChange={(e) => setStoneCost(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Loại đá đính:</label>
                    <input type="text" className="form-control" value={stoneDesc} onChange={(e) => setStoneDesc(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: 700, color: '#334155' }}>Cộng VAT (%):</label>
                    <input type="number" className="form-control" value={vat} onChange={(e) => setVat(e.target.value)} style={{ padding: '6px 8px', fontSize: '12.5px' }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateKaratOptions}
                  style={{ marginTop: '10px', width: '100%', background: '#334155', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Tính & Tạo Lại Tất Cả Phương Án
                </button>
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
                    <input
                      type="radio"
                      name="defaultOption"
                      checked={!!opt.isSelected}
                      onChange={() => handleSelectDefaultOption(idx)}
                      title="Chọn làm phương án giá mặc định gửi cho Sale"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />

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
                        type="number"
                        className="form-control"
                        value={opt.quotedPrice}
                        onChange={(e) => handleOptionChange(idx, 'quotedPrice', parseFloat(e.target.value) || 0)}
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
            <button type="submit" className="btn-insp btn-insp-primary" style={{ background: '#0f172a', color: '#ffffff' }} disabled={submitting}>
              Xác Nhận Gửi Báo Giá Cho Sale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
