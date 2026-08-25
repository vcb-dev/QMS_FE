import React from 'react';

interface ChartTooltipProps {
  children: React.ReactNode;
  padding?: string;
  minWidth?: string;
}

// Khung tooltip nền tối dùng chung cho mọi biểu đồ recharts trong DashboardPage — nội dung bên
// trong (payload) khác nhau theo từng biểu đồ nên chỉ bọc children, không parse payload ở đây.
export const ChartTooltip: React.FC<ChartTooltipProps> = ({ children, padding = '8px 12px', minWidth }) => (
  <div
    style={{
      background: '#0f172a',
      color: '#fff',
      padding,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 700,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      minWidth,
    }}
  >
    {children}
  </div>
);
