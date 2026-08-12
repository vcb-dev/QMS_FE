import React, { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import type { Role } from '../types';
import { fetchMasterData, calculatePriceApi } from '../services/api';
import { useMetalPrices } from '../hooks/useMetalPrices';
import { MetalPricesSettingsModal } from './MetalPricesSettingsModal';
import { PRICING_DEFAULTS } from '../constants';
import { formatCurrency, formatNumberVN } from '../utils/currency';

interface PricingCalculatorViewProps {
  currentRole?: Role;
  onApplyToNewRequest?: (productData: any) => void;
}

type StoneRow = {
  id: string;
  type: string;
  sizeDesc: string;
  qty: number;
  pricePerUnit: number;
};

export const PricingCalculatorView: React.FC<PricingCalculatorViewProps> = ({
  onApplyToNewRequest,
}) => {
  // Metal Prices hook (Realtime & DB backed with custom override capability)
  const {
    prices, loading: pricesLoading, error: pricesError, refresh: refreshPrices,
    formatted, apiFormatted, overrides: priceOverrides, saveOverrides, resetOverrides,
  } = useMetalPrices();

  const [showPriceSettings, setShowPriceSettings] = useState(false);

  // Master Data from DB (Materials & Categories)
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbMaterials, setDbMaterials] = useState<{ id: string; name: string }[]>([]);

  // Form Input States
  const [categoryId, setCategoryId] = useState('');
  const [materialType, setMaterialType] = useState('Vàng Trắng 18K (75%)');
  const [weightChi, setWeightChi] = useState<string>(PRICING_DEFAULTS.WEIGHT_CHI);
  const [laborCost, setLaborCost] = useState<number>(PRICING_DEFAULTS.LABOR_COST);
  const [vatPct, setVatPct] = useState<number>(PRICING_DEFAULTS.VAT_PCT);

  // Stone Rows State - Starts empty
  const [stoneRows, setStoneRows] = useState<StoneRow[]>([]);

  // Calculation Result state (returned directly from BE)
  const [quotedPrice, setQuotedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Stone management handlers
  const addStoneRow = () => {
    setStoneRows((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'Kim cương tự nhiên',
        sizeDesc: 'Tiêu chuẩn',
        qty: 1,
        pricePerUnit: 1000000,
      },
    ]);
  };

  const updateStoneRow = (id: string, patch: Partial<StoneRow>) => {
    setStoneRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeStoneRow = (id: string) => {
    setStoneRows((prev) => prev.filter((r) => r.id !== id));
  };

  const totalStoneCost = stoneRows.reduce((sum, r) => sum + r.qty * r.pricePerUnit, 0);

  // Giá vừa tính chỉ còn đúng với đúng bộ thông số lúc tính — nếu người dùng sửa lại
  // bất kỳ thông số nào sau đó, phải xoá kết quả cũ để tránh áp giá sai vào đơn hàng.
  useEffect(() => {
    setQuotedPrice(null);
    setErrorMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialType, weightChi, laborCost, vatPct, stoneRows, priceOverrides.gold, priceOverrides.silver]);

  // Function to call BE calculate endpoint
  const handleCalculate = async () => {
    if (!materialType) {
      alert('Vui lòng chọn chất liệu chế tác');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      // Ghi đè giá vàng/bạc (nếu người dùng đã tùy chỉnh) — nếu không gửi kèm,
      // Backend sẽ luôn tính theo giá thị trường mặc định và bỏ qua tùy chỉnh của người dùng.
      const goldPriceOverride = priceOverrides.gold
        ? parseFloat(priceOverrides.gold.replace(/\D/g, '')) || undefined
        : undefined;
      const silverPriceOverride = priceOverrides.silver
        ? parseFloat(priceOverrides.silver.replace(/\D/g, '')) || undefined
        : undefined;

      const res = await calculatePriceApi({
        materialNameOrKey: materialType,
        weightChi: parseFloat(weightChi) || 0,
        laborCost: laborCost || 0,
        stoneCost: totalStoneCost || 0,
        vatRate: vatPct || 0,
        goldPriceOverride,
        silverPriceOverride,
      });

      if (res && typeof res.quotedPrice === 'number' && Number.isFinite(res.quotedPrice)) {
        setQuotedPrice(res.quotedPrice);
      } else {
        setQuotedPrice(null);
        setErrorMessage('Không nhận được giá hợp lệ từ hệ thống');
      }
    } catch (err: any) {
      console.error('Lỗi tính giá BE:', err);
      setErrorMessage(err.message || 'Không thể tính giá từ hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      {/* Realtime Metal Prices Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          
          {/* Giá Vàng 24K */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                GIÁ VÀNG 24K (GOLD)
              </span>
              {priceOverrides.gold !== null && (
                <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#b45309', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                  TÙY CHỈNH
                </span>
              )}
            </div>
            <strong style={{ fontSize: '18px', fontWeight: 900, color: '#b45309', display: 'block', marginTop: '2px', letterSpacing: '-0.2px' }}>
              {formatted.gold24k} <span style={{ fontSize: '13px', fontWeight: 700 }}>đ/chỉ</span>
            </strong>
          </div>

          <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

          {/* Giá Bạc */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                GIÁ BẠC (SILVER)
              </span>
              {priceOverrides.silver !== null && (
                <span style={{ fontSize: '9.5px', fontWeight: 800, background: '#475569', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                  TÙY CHỈNH
                </span>
              )}
            </div>
            <strong style={{ fontSize: '18px', fontWeight: 900, color: '#334155', display: 'block', marginTop: '2px', letterSpacing: '-0.2px' }}>
              {formatted.silver} <span style={{ fontSize: '13px', fontWeight: 700 }}>đ/chỉ</span>
            </strong>
          </div>

        </div>

        {/* Nút Tùy chỉnh ở ngoài (giữ nguyên kiểu dáng như cũ) */}
        <button
          type="button"
          onClick={() => setShowPriceSettings(true)}
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          Tùy chỉnh giá Vàng & Bạc
        </button>
      </div>

      {/* Main Grid Layout: 2 Columns */}
      <div className="modal-grid-2col">
        {/* Left Side: 3 Form Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Section 1: Thông số Sản phẩm & Kim loại */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              Thông số Sản phẩm & Kim loại
            </h3>

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
                    style={{ width: '100%', padding: '10px 45px 10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                    chỉ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Thông số Đá quý */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Thông số Đá quý
              </h3>
              <button
                type="button"
                onClick={addStoneRow}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: 800,
                  borderRadius: '6px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                }}
              >
                + THÊM ĐÁ
              </button>
            </div>

            {stoneRows.length > 0 ? (
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          Loại Đá
                        </label>
                        <input
                          type="text"
                          value={row.type}
                          onChange={(e) => updateStoneRow(row.id, { type: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 600, background: '#ffffff' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          Kích thước / Số lượng
                        </label>
                        <input
                          type="text"
                          value={row.sizeDesc}
                          onChange={(e) => updateStoneRow(row.id, { sizeDesc: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#ffffff' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                          Đơn giá (VNĐ)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberVN(row.pricePerUnit)}
                          onChange={(e) => updateStoneRow(row.id, { pricePerUnit: parseFloat(e.target.value.replace(/\D/g, '')) || 0 })}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12.5px', fontWeight: 700, background: '#ffffff', textAlign: 'right' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: '100%', padding: '24px', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Bấm <strong>"+ THÊM ĐÁ"</strong> ở trên để nhập danh sách đá quý
              </div>
            )}
          </div>

          {/* Section 3: Chế tác & Phí dịch vụ */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              Chế tác & Phí dịch vụ
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  TIỀN CÔNG CHẾ TÁC (VNĐ)
                </label>
                <input
                  type="text"
                  value={formatNumberVN(laborCost)}
                  onChange={(e) => setLaborCost(parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
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
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, outline: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Summary Card */}
        <div
          style={{
            background: '#F3F4F6',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            padding: '28px 24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            alignItems: 'center',
            textAlign: 'center',
            position: 'sticky',
            top: '20px',
          }}
        >
          {quotedPrice === null ? (
            <>
              {/* Ready to Calculate view */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#111827',
                  marginBottom: '4px',
                }}
              >
                <Calculator size={28} color="#b45309" />
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111827', margin: 0 }}>
                Sẵn sàng tính giá
              </h2>

              <p style={{ fontSize: '13px', color: '#4b5563', margin: 0, lineHeight: '1.5', maxWidth: '240px' }}>
                Nhập đầy đủ thông tin thông số sản phẩm ở bên trái để tính giá báo khách.
              </p>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: '10px',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Đang tính giá...' : 'Tính giá ngay'}
              </button>

              <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                Dữ liệu được cập nhật theo tỷ giá thời gian thực
              </span>
            </>
          ) : (
            <>
              {/* Calculated Result View */}
              <div style={{ width: '100%', textAlign: 'left', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>
                  TỔNG BÁO GIÁ ĐỀ XUẤT
                </span>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a', marginTop: '6px' }}>
                  {formatCurrency(quotedPrice)}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCalculate}
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  color: '#4b5563',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Đang tính lại...' : 'Tính lại giá'}
              </button>

              <button
                type="button"
                onClick={() => onApplyToNewRequest?.({ suggestedPrice: quotedPrice, categoryId, materialType })}
                style={{
                  width: '100%',
                  background: '#fef3c7',
                  color: '#b45309',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Tạo Đơn Với Giá Này →
              </button>
            </>
          )}

          {errorMessage && (
            <div style={{ color: '#b91c1c', fontSize: '12px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px', width: '100%' }}>
              ⚠️ {errorMessage}
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
        overrides={priceOverrides}
        apiFormatted={apiFormatted}
        onSave={saveOverrides}
        onReset={resetOverrides}
      />
    </div>
  );
};
