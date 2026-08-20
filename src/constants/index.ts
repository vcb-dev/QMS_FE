export const STORAGE_KEYS = {
  TOKEN: 'vcb_qms_token',
  USER: 'vcb_qms_user',
} as const;

export const UI_CONSTANTS = {
  FALLBACK_PRODUCT_IMAGE: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
  DEFAULT_PRICER_EMAIL: import.meta.env.VITE_DEFAULT_PRICER_EMAIL || '',

  PRODUCT_LIBRARY: {
    DEFAULT_PAGE_SIZE: 8,
    PAGE_SIZE_OPTIONS: [8, 12, 16, 24, 48],
    GRID_COLUMNS_DESKTOP: 4,
  },

  DASHBOARD: {
    RECENT_REQUESTS_LIMIT: 5,
    RECENT_PRODUCTS_LIMIT: 4,
    GRID_COLUMNS_DESKTOP: 4,
  },
};

export const PRICING_DEFAULTS = {
  WEIGHT_CHI: '1.2',
  LABOR_COST: 500000,
  VAT_PCT: 10,
  REFRESH_MS: 24 * 60 * 60 * 1000,
};

// Ánh xạ status -> field đếm trong các object StatusCounts (FilterBar, SaleStatusStatsGrid).
export const STATUS_COUNT_KEYS: Record<string, string> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  NEED_MORE_INFO: 'needMoreInfo',
  QUOTED: 'quoted',
  REJECTED: 'rejected',
  CLOSED: 'closed',
};

// Màu/label dùng cho biểu đồ, ô lọc trạng thái (FilterBar, SaleStatusStatsGrid, DashboardPage).
export const STATUS_CHART_META: { value: string; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Mới tạo', color: '#3b82f6' },
  { value: 'PROCESSING', label: 'Đang xử lý', color: '#f59e0b' },
  { value: 'NEED_MORE_INFO', label: 'Cần bổ sung', color: '#f97316' },
  { value: 'QUOTED', label: 'Hoàn thành', color: '#22c55e' },
  { value: 'CLOSED', label: 'Đã chốt', color: '#8b5cf6' },
  { value: 'REJECTED', label: 'Từ chối', color: '#ef4444' },
];

// Màu/label/nền dùng cho badge trạng thái trong bảng (QuoteTable, CustomersPage).
export const STATUS_BADGE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'Mới tạo', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  PROCESSING: { label: 'Đang xử lý', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  NEED_MORE_INFO: { label: 'Cần bổ sung', color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
  QUOTED: { label: 'Đã báo giá', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  REJECTED: { label: 'Từ chối', color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  CLOSED: { label: 'Đã chốt', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
};
