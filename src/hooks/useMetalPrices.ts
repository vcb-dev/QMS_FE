import { useState, useEffect, useRef } from 'react';
import { fetchBaseMetals } from '../services/api';
import type { BaseMetal } from '../types';

// Không cache ở localStorage — giá gốc là dữ liệu nhạy cảm (chỉ ORDER/ADMIN được xem, chặn ở BE)
// và cache cũ khiến UI hiện giá sai lệch với DB. BE đã tự cache 60s trong RAM
// (APP_CONSTANTS.REFERENCE_DATA_TTL) nên FE luôn fetch mới không lo dồn query DB.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 phút — đủ tươi, không gọi API dồn dập

export function useMetalPrices() {
  const [baseMetals, setBaseMetals] = useState<BaseMetal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: BaseMetal[] = await fetchBaseMetals();
      if (Array.isArray(data)) {
        setBaseMetals(data);
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

  // Tra giá theo TÊN kim loại gốc (VD "Vàng 24K") — dùng ở nơi chỉ có sẵn tên, không có id.
  const findPrice = (baseMetalName: string): number =>
    baseMetals.find((m) => m.name === baseMetalName)?.priceVnd || 0;

  return { baseMetals, loading, error, refresh: fetchPrices, findPrice };
}
