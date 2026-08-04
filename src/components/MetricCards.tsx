import React from 'react';

interface MetricCardsProps {
  counts: {
    total: number;
    ycMoi: number;
    dangXly: number;
    xong: number;
  };
  currentFilter?: string;
  onFilterChange?: (filter: string) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  counts,
  currentFilter,
  onFilterChange,
}) => {
  return (
    <div className="metric-grid">
      <div
        className={`metric-card tone-blue ${currentFilter === 'ALL' ? 'active-card' : ''}`}
        onClick={() => onFilterChange && onFilterChange('ALL')}
        style={{ cursor: 'pointer' }}
        title="Bấm để lọc Tất cả yêu cầu"
      >
        <span>Tổng Yêu Cầu Báo Giá</span>
        <strong>{counts.total}</strong>
      </div>

      <div
        className={`metric-card tone-amber ${currentFilter === 'YC_MOI' ? 'active-card' : ''}`}
        onClick={() => onFilterChange && onFilterChange('YC_MOI')}
        style={{ cursor: 'pointer' }}
        title="Bấm để lọc Yêu Cầu Mới"
      >
        <span>YC Mới Chờ Tiếp Nhận</span>
        <strong>{counts.ycMoi}</strong>
      </div>

      <div
        className={`metric-card tone-indigo ${currentFilter === 'DANG_XLY' ? 'active-card' : ''}`}
        onClick={() => onFilterChange && onFilterChange('DANG_XLY')}
        style={{ cursor: 'pointer' }}
        title="Bấm để lọc Đang Xử Lý"
      >
        <span>Đang Xử Lý (Pricing)</span>
        <strong>{counts.dangXly}</strong>
      </div>

      <div
        className={`metric-card tone-green ${currentFilter === 'XONG' ? 'active-card' : ''}`}
        onClick={() => onFilterChange && onFilterChange('XONG')}
        style={{ cursor: 'pointer' }}
        title="Bấm để lọc Đã Báo Giá"
      >
        <span>Đã Hoàn Tất Báo Giá</span>
        <strong>{counts.xong}</strong>
      </div>
    </div>
  );
};
