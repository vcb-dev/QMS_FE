import { useState, useEffect, useRef } from 'react';
import { fetchMetalPrices } from '../services/api';

export interface MetalPrices {
  gold24kVnd: number;
  silverVnd: number;
  updatedAt: string;
  source: string;
}

export interface ManualOverrides {
  gold: string | null;
  silver: string | null;
}

const CACHE_KEY     = 'metalPrices_cache';
const OVERRIDES_KEY = 'metalPrices_overrides';
const CACHE_TTL_MS  = 12 * 60 * 60 * 1000; // 12 hours

const DEFAULTS: MetalPrices = {
  gold24kVnd: 13_900_000,
  silverVnd: 1_200_000,
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

export function readOverrides(): ManualOverrides {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return { gold: null, silver: null };
    return JSON.parse(raw);
  } catch {
    return { gold: null, silver: null };
  }
}

export function writeOverrides(overrides: ManualOverrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {}
}

export function clearOverrides() {
  try {
    localStorage.removeItem(OVERRIDES_KEY);
  } catch {}
}

function fmt(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

export function useMetalPrices() {
  const cached = readCache();
  const [prices, setPrices] = useState<MetalPrices>(cached ?? DEFAULTS);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Persistent manual overrides (survive page refresh)
  const [overrides, setOverridesState] = useState<ManualOverrides>(readOverrides);
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

  /** Save overrides and persist to localStorage */
  const saveOverrides = (next: ManualOverrides) => {
    writeOverrides(next);
    setOverridesState(next);
  };

  /** Clear all overrides → revert to API prices */
  const resetOverrides = () => {
    clearOverrides();
    setOverridesState({ gold: null, silver: null });
  };

  useEffect(() => {
    if (!cached) fetchPrices();
    timerRef.current = setInterval(fetchPrices, CACHE_TTL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effective prices: override wins over API
  const effectiveGold   = overrides.gold   ?? fmt(prices.gold24kVnd);
  const effectiveSilver = overrides.silver ?? fmt(prices.silverVnd);

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
    overrides,
    saveOverrides,
    resetOverrides,
    /** Effective formatted prices (override > API > defaults) */
    formatted: {
      gold24k: effectiveGold,
      silver:  effectiveSilver,
    },
    /** Raw API formatted (without override) */
    apiFormatted: {
      gold24k: fmt(prices.gold24kVnd),
      silver:  fmt(prices.silverVnd),
    },
  };
}
