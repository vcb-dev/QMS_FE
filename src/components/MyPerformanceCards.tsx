import React from 'react';
import { ClipboardList, FileCheck, Timer } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatDuration } from '../utils/currency';
import type { MyPerformanceResponse } from '../types';

interface MyPerformanceCardsProps {
  // null = đang tải hoặc tải lỗi (lỗi đã được nuốt + console.error ở nơi gọi) -> hiện '---'.
  data: MyPerformanceResponse | null;
}

// 3 ô hiệu suất của CHÍNH Order đang đăng nhập trên Dashboard. Theo bộ chọn thời gian của Dashboard,
// không phụ thuộc nút "Chỉ mình tôi". Thời gian báo giá = từ lúc đơn được tạo tới lúc báo giá, tính trên
// các đơn do chính Order này báo giá.
export const MyPerformanceCards: React.FC<MyPerformanceCardsProps> = ({ data }) => (
  <div>
    <h2 className="text-[19px] font-extrabold text-[#0f172a] m-0 mb-[12px]">Hiệu suất của tôi</h2>
    <div className="grid grid-cols-3 gap-[16px]">
      <StatCard
        icon={<ClipboardList size={14} />}
        label="Đơn được giao"
        value={data ? data.assignedCount : '---'}
      />
      <StatCard
        icon={<FileCheck size={14} />}
        label="Đơn đã báo giá"
        value={data ? data.quotedCount : '---'}
      />
      <StatCard
        icon={<Timer size={14} />}
        label="Thời gian báo giá trung vị"
        value={(data && data.medianQuoteMs !== null ? formatDuration(0, data.medianQuoteMs) : null) ?? '---'}
      />
    </div>
  </div>
);
