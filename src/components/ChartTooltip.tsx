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
    className="bg-[#0f172a] text-white rounded-[8px] text-[12px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
    // động — recharts
    style={{
      padding,
      minWidth,
    }}
  >
    {children}
  </div>
);
