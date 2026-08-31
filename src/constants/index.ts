export const STORAGE_KEYS = {
  USER: 'vcb_qms_user',
} as const;

export const UI_CONSTANTS = {
  FALLBACK_PRODUCT_IMAGE: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36', // TODO: thay bằng ảnh local trong public/
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

  CREATE_QUOTE_REQUEST: {
    MAX_IMAGES: 5,
    MAX_VIDEO_SIZE_MB: 100,
    // Số khách hàng tối đa hiển thị trong dropdown chọn khách (danh sách mặc định lẫn kết quả tìm)
    CUSTOMER_DROPDOWN_LIMIT: 10,
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
// Nhãn hiển thị cho dropdown xem-thử-giao-diện-theo-role của Admin (Header.tsx)
export const ROLE_SWITCH_LABEL: Record<'SALE' | 'ORDER' | 'ADMIN', string> = {
  SALE: 'Sale',
  ORDER: 'Order',
  ADMIN: 'Admin',
};

export  const COMPANY_LOGO_URL = 'https://vienchibao.com/wp-content/uploads/2025/01/logo.png';
// Ảnh vuông (1024x1024) — đặt trong public/ nên tham chiếu thẳng qua URL gốc, không import qua src/assets
export const BACKGROUND_IMAGE_URL = '/screen.png';

export const STONE_PAGE_SIZE = 5;
export const CATEGORY_PAGE_SIZE = 10;
// Giá trị đại diện "không giới hạn" cho bậc lợi nhuận cuối cùng — hiển thị dạng ∞/toggle thay vì bắt nhập số khổng lồ
export const UNLIMITED_MAX_COST = 999_999_999_999;

// Map lựa chọn "Khách tỷ lệ chốt" (CreateModal) sang closeRatePct gửi BE.
// pct = null → không gửi field (khách không thực hiện báo giá).
export const CLOSE_RATE_OPTIONS: { value: string; label: string; pct: number | null }[] = [
  { value: 'NOT_YET', label: 'Khách chưa chốt báo giá', pct: 0 },
  { value: 'DEPOSITED', label: 'Khách đã đặt cọc', pct: 90 },
  { value: 'SURE', label: 'Chắc chắn 100% lấy hàng', pct: 100 },
  { value: 'NO_QUOTE', label: 'Không thực hiện báo giá', pct: null },
];