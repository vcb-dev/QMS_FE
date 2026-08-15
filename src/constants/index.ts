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
  STONE_COST: 300000,
  MANUAL_BASE_PRICE: 1200000,
  VAT_PCT: 10,
  STONE_DESC: 'Đá CZ cao cấp',
  SILVER_PLATING_EXTRA: 150000,
  FALLBACK_GOLD_24K: 13900000,
  FALLBACK_SILVER: 1200000,
  SILVER_MULTIPLIER: 3,
  PROFIT_DIVISOR: 0.7,
};
export const QUOTE_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'YC_MOI', label: 'Yêu cầu mới' },
  { value: 'DANG_XLY', label: 'Đang xử lý' },
  { value: 'NEED_MORE_INFO', label: 'Cần bổ sung thông tin' },
  { value: 'XONG', label: 'Hoàn thành / Đã báo giá' },
  { value: 'DA_CHOT', label: 'Đã chốt' },
  { value: 'TU_CHOI', label: 'Bị từ chối' },
] as const;