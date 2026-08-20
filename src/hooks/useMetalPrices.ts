import { useState, useEffect, useRef } from 'react';
import { fetchMetalPrices } from '../services/api';
import { formatNumberVN } from '../utils/currency';

export interface MetalPrices {
  gold24kVnd: number;
  silverVnd: number;
  platinumVnd: number;
  updatedAt: string;
  source: string;
}

// Không cache ở localStorage nữa — giá gốc là dữ liệu nhạy cảm (chỉ ORDER/ADMIN được xem, chặn
// ở BE) và cache cũ khiến UI hiện giá sai lệch với DB tới 12 tiếng. BE đã tự cache 60s trong RAM
// (APP_CONSTANTS.REFERENCE_DATA_TTL) nên FE luôn fetch mới không lo dồn query DB.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 phút — đủ tươi, không gọi API dồn dập

const DEFAULTS: MetalPrices = {
  gold24kVnd: 13_900_000,
  silverVnd: 1_200_000,
  platinumVnd: 6_300_000,
  updatedAt: new Date().toISOString(),
  source: 'defaults (13.9 triệu)',
};

function fmt(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return formatNumberVN(num);
}

export function useMetalPrices() {
  const [prices, setPrices] = useState<MetalPrices>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: MetalPrices = await fetchMetalPrices();
      if (data && typeof data.gold24kVnd === 'number') {
        setPrices(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    timerRef.current = setInterval(fetchPrices, REFRESH_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
    formatted: {
      gold24k: fmt(prices.gold24kVnd),
      silver:  fmt(prices.silverVnd),
      platinum: fmt(prices.platinumVnd),
    },
  };
}
