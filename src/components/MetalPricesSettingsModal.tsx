import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X, Settings, TrendingUp, Zap, Clock, Save, RotateCcw, CheckCircle2,NotepadText } from 'lucide-react';
import type { MetalPrices } from '../hooks/useMetalPrices';
import { formatNumberVN } from '../utils/currency';

interface MetalPricesSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prices: MetalPrices;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onSave: (payload: { gold24kVnd?: number; silverVnd?: number }) => Promise<void>;
}

function stripToNumber(s: string): string {
  const raw = s.replace(/\D/g, '');
  return raw ? formatNumberVN(Number(raw)) : '';
}

function fmt(num: number): string {
  return formatNumberVN(num);
}

export const MetalPricesSettingsModal: React.FC<MetalPricesSettingsModalProps> = ({
  isOpen,
  onClose,
  prices,
  loading,
  error,
  onRefresh,
  onSave,
}) => {
  const [goldInput, setGoldInput]     = useState(fmt(prices.gold24kVnd));
  const [silverInput, setSilverInput] = useState(fmt(prices.silverVnd));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Chỉ đóng modal nếu cả mousedown lẫn click đều bắt đầu/kết thúc trên nền backdrop —
  // tránh việc bôi đen (select) text rồi thả chuột ra ngoài bị hiểu nhầm là bấm ra ngoài để đóng.
  const mouseDownOnBackdrop = useRef(false);

  // Sync when props change (e.g. API prices refreshed)
  useEffect(() => {
    setGoldInput(fmt(prices.gold24kVnd));
    setSilverInput(fmt(prices.silverVnd));
  }, [prices.gold24kVnd, prices.silverVnd]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        gold24kVnd: parseFloat(goldInput.replace(/\D/g, '')) || undefined,
        silverVnd: parseFloat(silverInput.replace(/\D/g, '')) || undefined,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 800);
    } catch (err: any) {
      setSaveError(err.message || 'Lưu giá thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    setGoldInput(fmt(prices.gold24kVnd));
    setSilverInput(fmt(prices.silverVnd));
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (mouseDownOnBackdrop.current && e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#ffffff', borderRadius: '20px', width: '520px', maxWidth: '95vw', boxShadow: '0 24px 48px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Settings size={20} color="#fbbf24" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '16px', letterSpacing: '-0.2px' }}>Cài đặt giá kim loại (Vàng & Bạc)</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11.5px', marginTop: '2px' }}>
                Tự động cập nhật mỗi 12h · Có thể sửa thủ công
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'background 0.15s' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        

          {/* Price Inputs */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Giá kim loại (VNĐ / chỉ = 3.75g) — Nhấn vào giá để sửa
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PriceRow
                label="Vàng 24K"
                dbValue={fmt(prices.gold24kVnd)}
                value={goldInput}
                onChange={(v) => setGoldInput(stripToNumber(v))}
                onReset={() => setGoldInput(fmt(prices.gold24kVnd))}
                accent="#b45309" bg="linear-gradient(135deg, #fffdf5 0%, #fef3c7 100%)" border="#fde68a"
              />
              <PriceRow
                label="Bạc (Silver)"
                dbValue={fmt(prices.silverVnd)}
                value={silverInput}
                onChange={(v) => setSilverInput(stripToNumber(v))}
                onReset={() => setSilverInput(fmt(prices.silverVnd))}
                accent="#334155" bg="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" border="#cbd5e1"
              />
            </div>
          </div>

          {/* Info */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', fontSize: '11.5px', color: '#64748b', lineHeight: '1.6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <NotepadText size={12} color="#0f172a" /> <span style={{ fontWeight: 800, color: '#0f172a' }}>Sửa thủ công</span>
            </div>
            Giá được áp dụng cho mọi lượt tính giá sau đó của tất cả người dùng.
          </div>

          {saveError && (
            <div style={{ color: '#b91c1c', fontSize: '12px', background: '#fef2f2', border: '1px solid #fca5a5', padding: '10px', borderRadius: '8px' }}>
               {saveError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleResetAll}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
            >
              <RotateCcw size={13} /> Hủy sửa
            </button>
            <button
              onClick={handleSave}
              disabled={saved || saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '10px', background: saved ? '#16a34a' : '#0f172a', border: 'none', fontSize: '13px', fontWeight: 800, color: 'white', cursor: (saved || saving) ? 'default' : 'pointer', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)', transition: 'background 0.3s', opacity: saving ? 0.7 : 1 }}
            >
              {saved ? <><CheckCircle2 size={13} /> Đã lưu!</> : <><Save size={13} /> {saving ? 'Đang lưu...' : 'Lưu vào hệ thống'}</>}
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
  dbValue: string; value: string;
  onChange: (v: string) => void; onReset: () => void;
  accent: string; bg: string; border: string;
}

const PriceRow: React.FC<PriceRowProps> = ({ label, dbValue, value, onChange, onReset, accent, bg, border }) => {
  const [focused, setFocused] = useState(false);
  const isDirty = value !== dbValue;

  return (
    <div style={{ background: bg, border: `2px solid ${focused ? accent : (isDirty ? accent + '80' : border)}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color 0.15s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
          {isDirty && <span style={{ fontSize: '10px', background: accent, color: 'white', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>Chưa lưu</span>}
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
            Hiện tại: {dbValue} ₫ &nbsp;
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
