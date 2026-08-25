import React from 'react';

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
    style={{
      gridColumn: fullWidth ? '1 / -1' : undefined,
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '12px',
    }}
  >
    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
      {icon} {label}
    </span>
    <strong style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', display: 'block', ...valueStyle }} title={title}>
      {value}
    </strong>
  </div>
);
