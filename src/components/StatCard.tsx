import React from 'react';

const TONE_STYLES: Record<'default' | 'success' | 'warning', { bg: string; border: string; color: string }> = {
  default: { bg: '#ffffff', border: '#e2e8f0', color: '#64748b' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
  warning: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
};

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
}

// Card "icon + nhãn nhỏ chữ hoa / số liệu lớn" dùng chung — StaffPage và CustomersPage trước đây
// tự viết lặp lại y hệt (kể cả 2 biến thể màu default/success), chỉ khác nội dung.
export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, tone = 'default' }) => {
  const t = TONE_STYLES[tone];
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: t.color, textTransform: 'uppercase' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 900, color: tone === 'default' ? '#0f172a' : t.color, marginTop: '6px' }}>{value}</div>
    </div>
  );
};
