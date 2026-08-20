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

const CACHE_KEY    = 'metalPrices_cache';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const DEFAULTS: MetalPrices = {
  gold24kVnd: 13_900_000,
  silverVnd: 1_200_000,
  platinumVnd: 6_300_000,
  updatedAt: new Date().toISOString(),
  source: 'defaults (13.9 triệu)',
};

interface CacheEntry {
  data: MetalPrices;
  fetchedAt: number;
}

function readCache(): MetalPrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: MetalPrices) {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

function fmt(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return formatNumberVN(num);
}

export function useMetalPrices() {
  const cached = readCache();
  const [prices, setPrices] = useState<MetalPrices>(cached ?? DEFAULTS);
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
        writeCache(data);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cached) fetchPrices();
    timerRef.current = setInterval(fetchPrices, CACHE_TTL_MS);
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
