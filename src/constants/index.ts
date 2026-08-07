export const STORAGE_KEYS = {
  TOKEN: 'vcb_qms_token',
  USER: 'vcb_qms_user',
} as const;

export const UI_CONSTANTS = {
  FALLBACK_PRODUCT_IMAGE: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
  DEFAULT_PRICER_EMAIL: import.meta.env.VITE_DEFAULT_PRICER_EMAIL || '',
};

function requiredNumberSetting(name: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Missing or invalid frontend setting: ${name}`);
  return parsed;
}

export const PRICING_DEFAULTS = {
  WEIGHT_CHI: import.meta.env.VITE_PRICING_DEFAULT_WEIGHT_CHI,
  LABOR_COST: requiredNumberSetting('VITE_PRICING_DEFAULT_LABOR_COST', import.meta.env.VITE_PRICING_DEFAULT_LABOR_COST),
  STONE_COST: requiredNumberSetting('VITE_PRICING_DEFAULT_STONE_COST', import.meta.env.VITE_PRICING_DEFAULT_STONE_COST),
  MANUAL_BASE_PRICE: requiredNumberSetting('VITE_PRICING_DEFAULT_MANUAL_BASE_PRICE', import.meta.env.VITE_PRICING_DEFAULT_MANUAL_BASE_PRICE),
  VAT_PCT: requiredNumberSetting('VITE_PRICING_DEFAULT_VAT_PCT', import.meta.env.VITE_PRICING_DEFAULT_VAT_PCT),
  STONE_DESC: import.meta.env.VITE_PRICING_DEFAULT_STONE_DESC,
  SILVER_PLATING_EXTRA: requiredNumberSetting('VITE_PRICING_SILVER_PLATING_EXTRA', import.meta.env.VITE_PRICING_SILVER_PLATING_EXTRA),
  FALLBACK_GOLD_24K: requiredNumberSetting('VITE_PRICING_FALLBACK_GOLD_24K', import.meta.env.VITE_PRICING_FALLBACK_GOLD_24K),
  FALLBACK_SILVER: requiredNumberSetting('VITE_PRICING_FALLBACK_SILVER', import.meta.env.VITE_PRICING_FALLBACK_SILVER),
  SILVER_MULTIPLIER: requiredNumberSetting('VITE_PRICING_SILVER_MULTIPLIER', import.meta.env.VITE_PRICING_SILVER_MULTIPLIER),
  GOLD_APPLIED_RATIO: requiredNumberSetting('VITE_PRICING_GOLD_APPLIED_RATIO', import.meta.env.VITE_PRICING_GOLD_APPLIED_RATIO),
  PROFIT_DIVISOR: requiredNumberSetting('VITE_PRICING_PROFIT_DIVISOR', import.meta.env.VITE_PRICING_PROFIT_DIVISOR),
};
