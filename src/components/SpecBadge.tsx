import React from 'react';
import clsx from 'clsx';

interface SpecBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
  valueStyle?: React.CSSProperties;
  title?: string;
}

// Ô thông số sản phẩm dạng "icon + nhãn nhỏ chữ hoa / giá trị đậm" — dùng lặp lại nhiều lần trong
// lưới thông số của DetailPage (Chất liệu, Đá quý, Danh mục, Khối lượng, Số đo, Tỷ lệ chốt...).
export const SpecBadge: React.FC<SpecBadgeProps> = ({ icon, label, value, fullWidth, valueStyle, title }) => (
  <div
    className={clsx("bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-[12px]", fullWidth && "col-span-full")}
  >
    <span className="text-[10.5px] font-extrabold text-[#64748b] uppercase flex items-center gap-[5px]">
      {icon} {label}
    </span>
    {/* động — giữ inline */}
    <strong className="text-[13px] text-[#0f172a] mt-[4px] block" style={valueStyle} title={title}>
      {value}
    </strong>
  </div>
);
