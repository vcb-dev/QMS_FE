import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { cardStyle } from '../styles/card';

interface DistributionDatum {
  name: string;
  value: number;
  fill: string;
}

interface DistributionPieCardProps {
  title: string;
  subtitle: string;
  data: DistributionDatum[];
}

// Card "biểu đồ tròn nhỏ + top 5 legend" — DashboardPage dùng y hệt cấu trúc này cho 2 khối
// "Phân bố theo danh mục" và "Phân bố theo chất liệu", chỉ khác tiêu đề/nguồn data.
export const DistributionPieCard: React.FC<DistributionPieCardProps> = ({ title, subtitle, data }) => (
  <div style={cardStyle}>
    <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>{title}</h2>
    <span style={{ fontSize: '11px', color: '#64748b' }}>{subtitle}</span>

    {data.length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={56} paddingAngle={2} dataKey="value" isAnimationActive animationDuration={600}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <ChartTooltip>
                      <div style={{ color: d.payload.fill }}>● {d.name}</div>
                      <div>{d.value} yêu cầu</div>
                    </ChartTooltip>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {data.slice(0, 5).map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', flexShrink: 0 }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>Chưa có dữ liệu</div>
    )}
  </div>
);
