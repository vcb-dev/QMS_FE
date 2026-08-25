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
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
    <span style={labelStyle}>{label}</span>
    <strong style={{ color: '#0f172a', ...valueStyle }}>{value}</strong>
  </div>
);
