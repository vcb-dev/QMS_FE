import React from 'react';
import clsx from 'clsx';

const TONE_CLASSES: Record<'default' | 'success' | 'warning', { card: string; label: string; value: string }> = {
  default: {
    card: 'bg-white border-[#e2e8f0]',
    label: 'text-[#64748b]',
    value: 'text-[#0f172a]',
  },
  success: {
    card: 'bg-[#f0fdf4] border-[#bbf7d0]',
    label: 'text-[#15803d]',
    value: 'text-[#15803d]',
  },
  warning: {
    card: 'bg-[#fff7ed] border-[#fed7aa]',
    label: 'text-[#c2410c]',
    value: 'text-[#c2410c]',
  },
};

interface StatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
  // % tăng/giảm so với kỳ trước (VD tháng trước) — null = kỳ trước bằng 0, không có mốc để so sánh.
  deltaPct?: number | null;
  deltaLabel?: string;
}

// Card "icon + nhãn nhỏ chữ hoa / số liệu lớn" dùng chung — StaffPage và CustomersPage trước đây
// tự viết lặp lại y hệt (kể cả 2 biến thể màu default/success), chỉ khác nội dung.
export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, tone = 'default', deltaPct, deltaLabel = 'so với tháng trước' }) => {
  const t = TONE_CLASSES[tone];
  const hasDelta = deltaPct !== undefined;
  const deltaCls = deltaPct == null ? 'text-[#94a3b8]' : deltaPct > 0 ? 'text-[#15803d]' : deltaPct < 0 ? 'text-[#dc2626]' : 'text-[#64748b]';
  const deltaText = deltaPct == null ? 'Chưa có dữ liệu kỳ trước' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}% ${deltaLabel}`;
  return (
    <div className={clsx("border border-solid rounded-[14px] py-[18px] px-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]", t.card)}>
      <div className={clsx("flex items-center gap-[8px] text-[11px] font-extrabold uppercase", t.label)}>
        {icon}
        {label}
      </div>
      <div className={clsx("text-[24px] font-black mt-[6px]", t.value)}>{value}</div>
      {hasDelta && (
        <div className={clsx("text-[11px] font-bold mt-[6px]", deltaCls)}>{deltaText}</div>
      )}
    </div>
  );
};
