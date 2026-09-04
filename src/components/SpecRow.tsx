import React from 'react';

interface SpecRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  labelStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
}

// Dòng "nhãn bên trái / giá trị đậm bên phải" — dùng lặp lại nhiều lần trong khối cấu thành giá
// (Bảng Kê Giá & VAT) của DetailPage.
export const SpecRow: React.FC<SpecRowProps> = ({ label, value, labelStyle, valueStyle }) => (
  <div className="flex justify-between gap-[8px]">
    {/* động — giữ inline */}
    <span style={labelStyle}>{label}</span>
    {/* động — giữ inline */}
    <strong className="text-[#0f172a]" style={valueStyle}>{value}</strong>
  </div>
);
