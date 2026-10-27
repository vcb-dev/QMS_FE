import React from 'react';
import { TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { cardContainerCls, cardHeadingCls, emptyTextCls, staffThCls } from '../styles/classNames';
import { formatDuration } from '../utils/currency';
import type { PricerPerformanceResponse } from '../types';

interface PricerPerformanceTableProps {
  // null = đang tải hoặc tải lỗi (lỗi đã được nuốt + console.error ở nơi gọi).
  data: PricerPerformanceResponse | null;
  currentUserId: string;
}

// Bảng hiệu suất các Order trên Dashboard của ORDER — Order xem được của nhau (không có số của Sale). Theo
// bộ chọn thời gian của Dashboard; BE đã xếp theo số đơn đã báo giá giảm dần. Dòng của chính mình được
// đánh dấu.
export const PricerPerformanceTable: React.FC<PricerPerformanceTableProps> = ({ data, currentUserId }) => (
  <div className={cardContainerCls}>
    <h2 className={cardHeadingCls}>
      <TrendingUp size={16} color="#2563eb" /> Hiệu suất người báo giá
    </h2>
    <span className="text-[14px] text-muted">
      Số yêu cầu được giao, số yêu cầu báo giá và thời gian báo giá trung vị của từng Order
    </span>

    {data && data.items.length > 0 ? (
      <div className="overflow-x-auto mt-[10px]">
        <table className="w-full border-collapse text-[15.5px]">
          <thead>
            <tr className="border-b border-[#f1f5f9] text-left">
              <th className={staffThCls}>Order</th>
              <th className={clsx(staffThCls, 'text-right')}>Số yêu cầu được giao</th>
              <th className={clsx(staffThCls, 'text-right')}>Số yêu cầu báo giá</th>
              <th className={clsx(staffThCls, 'text-right')}>Thời gian trung vị</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => {
              const isMe = p.id === currentUserId;
              return (
                <tr key={p.id} className={clsx('border-b border-[#f8fafc]', isMe && 'bg-[#f1f5f9]')}>
                  <td className="p-[10px] font-bold text-[#0f172a]">
                    {p.name}
                    {isMe && <span className="ml-[8px] text-[13px] font-extrabold text-muted">(Bạn)</span>}
                  </td>
                  <td className="p-[10px] text-right text-[#334155]">{p.assignedCount}</td>
                  <td className="p-[10px] text-right text-[#334155]">{p.quotedCount}</td>
                  <td className="p-[10px] text-right text-[#0f766e] font-bold">
                    {(p.medianQuoteMs !== null ? formatDuration(0, p.medianQuoteMs) : null) ?? '---'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <div className={emptyTextCls}>{data ? 'Chưa có Order nào trong hệ thống' : 'Chưa có dữ liệu'}</div>
    )}
  </div>
);
