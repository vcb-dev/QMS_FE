import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Settings, TrendingUp, Zap, Clock, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { MetalPrices, ManualOverrides } from '../hooks/useMetalPrices';

interface MetalPricesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prices: MetalPrices;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  overrides: ManualOverrides;
  apiFormatted: { gold24k: string; silver: string };
  onSave: (overrides: ManualOverrides) => void;
  onReset: () => void;
}

function stripToNumber(s: string): string {
  const raw = s.replace(/\D/g, '');
  return raw ? Number(raw).toLocaleString('vi-VN') : '';
}

export const MetalPricesSettingsModal: React.FC<MetalPricesSettingsModalProps> = ({
  isOpen,
  onClose,
  prices,
  loading,
  error,
  onRefresh,
  overrides,
  apiFormatted,
  onSave,
  onReset,
}) => {
  const [goldInput, setGoldInput]     = useState(overrides.gold ?? apiFormatted.gold24k);
  const [silverInput, setSilverInput] = useState(overrides.silver ?? apiFormatted.silver);
  const [saved, setSaved] = useState(false);

  // Sync when props change (e.g. API prices refreshed)
  useEffect(() => {
    setGoldInput(overrides.gold ?? apiFormatted.gold24k);
    setSilverInput(overrides.silver ?? apiFormatted.silver);
  }, [overrides.gold, overrides.silver, apiFormatted.gold24k, apiFormatted.silver]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      gold:   goldInput   !== apiFormatted.gold24k ? goldInput   : null,
      silver: silverInput !== apiFormatted.silver  ? silverInput : null,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const handleResetAll = () => {
    onReset();
    setGoldInput(apiFormatted.gold24k);
    setSilverInput(apiFormatted.silver);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#ffffff', borderRadius: '20px', width: '520px', maxWidth: '95vw', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 800, fontSize: '16px' }}>Cài đặt giá kim loại (Vàng & Bạc)</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '2px' }}>
                Tự động cập nhật mỗi 12h · Có thể ghi đè thủ công
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* API Status */}
          <div style={{ background: error ? '#fef2f2' : '#f0fdf4', border: `1px solid ${error ? '#fca5a5' : '#86efac'}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: error ? '#ef4444' : '#22c55e', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: error ? '#dc2626' : '#15803d' }}>
                  {error ? 'Lỗi kết nối API' : 'API hoạt động bình thường'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                  {error || `Cập nhật: ${prices?.updatedAt ? new Date(prices.updatedAt).toLocaleString('vi-VN') : ''} `}
                </div>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#1d4ed8', border: 'none', color: 'white', fontSize: '12px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              {loading ? 'Đang tải...' : 'Cập nhật API'}
            </button>
          </div>

          {/* Price Inputs */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#374151', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Giá kim loại (VNĐ / chỉ = 3.75g) — Nhập tay để ghi đè
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PriceRow
                label="Vàng 24K"
                apiValue={apiFormatted.gold24k}
                value={goldInput}
                onChange={(v) => setGoldInput(stripToNumber(v))}
                onReset={() => setGoldInput(apiFormatted.gold24k)}
                isOverridden={overrides.gold !== null}
                accent="#b45309" bg="#fffbeb" border="#fde68a"
              />
              <PriceRow
                label="Bạc (Silver)"
                apiValue={apiFormatted.silver}
                value={silverInput}
                onChange={(v) => setSilverInput(stripToNumber(v))}
                onReset={() => setSilverInput(apiFormatted.silver)}
                isOverridden={overrides.silver !== null}
                accent="#475569" bg="#f8fafc" border="#cbd5e1"
              />
            </div>
          </div>

          {/* Info */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', fontSize: '11.5px', color: '#64748b', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Clock size={12} /> <span style={{ fontWeight: 700, color: '#374151' }}>Ghi đè thủ công</span>
            </div>
            Giá nhập tay được <strong>lưu vào trình duyệt</strong> và giữ sau khi tải lại trang.<br />
            Bấm <em>"Reset về API"</em> để xóa ghi đè và dùng lại giá tự động từ thị trường.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleResetAll}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
            >
              <RotateCcw size={13} /> Reset về API
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', background: saved ? '#16a34a' : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', border: 'none', fontSize: '13px', fontWeight: 700, color: 'white', cursor: saved ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)', transition: 'background 0.3s' }}
            >
              {saved ? <><CheckCircle2 size={13} /> Đã lưu!</> : <><Save size={13} /> Lưu & Áp dụng</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

// ── Sub-component: PriceRow ──────────────────────────────────────────────────
interface PriceRowProps {
  label: string;
  apiValue: string; value: string;
  onChange: (v: string) => void; onReset: () => void;
  isOverridden: boolean;
  accent: string; bg: string; border: string;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, apiValue, value, onChange, onReset, isOverridden, accent, bg, border }) => {
  const [focused, setFocused] = useState(false);
  const isDirty = value !== apiValue;

  return (
    <div style={{ background: bg, border: `2px solid ${focused ? accent : (isDirty ? accent + '80' : border)}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color 0.15s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
          {isOverridden && <span style={{ fontSize: '10px', background: accent, color: 'white', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>Đang ghi đè</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Nhập giá..."
            style={{ flex: 1, fontSize: '18px', fontWeight: 800, color: accent, border: 'none', background: 'transparent', outline: 'none', padding: 0, minWidth: 0, cursor: 'text' }}
          />
          <span style={{ fontSize: '12px', fontWeight: 700, color: accent, flexShrink: 0 }}>₫ / chỉ</span>
        </div>
        {isDirty && (
          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
            API: {apiValue} ₫ &nbsp;
            <button onClick={onReset} style={{ background: 'none', border: 'none', color: accent, fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              Hoàn tác
            </button>
          </div>
        )}
      </div>
      {isDirty ? <Zap size={16} color={accent} style={{ flexShrink: 0 }} /> : <TrendingUp size={16} color="#22c55e" style={{ flexShrink: 0 }} />}
    </div>
  );
};
