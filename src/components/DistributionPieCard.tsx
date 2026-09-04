import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { cardCls } from '../styles/classNames';

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
  <div className={cardCls}>
    <h2 className="text-[14px] font-extrabold text-[#0f172a] m-0 mb-[4px]">{title}</h2>
    <span className="text-[11px] text-[#64748b]">{subtitle}</span>

    {data.length > 0 ? (
      <div className="flex flex-col items-center gap-[12px] mt-[8px]">
        <div className="w-[120px] h-[120px] shrink-0">
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
                      {/* động — giữ inline */}
                      <div style={{ color: d.payload.fill }}>● {d.name}</div>
                      <div>{d.value} yêu cầu</div>
                    </ChartTooltip>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-[6px] w-full">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-[8px]">
              <div className="flex items-center gap-[6px] min-w-0">
                {/* động — giữ inline */}
                <div className="w-[8px] h-[8px] rounded-[3px] shrink-0" style={{ background: d.fill }} />
                <span className="text-[11px] text-[#475569] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{d.name}</span>
              </div>
              <span className="text-[12px] font-black text-[#0f172a] shrink-0">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center text-[#94a3b8] text-[12.5px] py-[24px]">Chưa có dữ liệu</div>
    )}
  </div>
);
