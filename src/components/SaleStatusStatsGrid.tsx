import React from 'react';
import { ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { fetchQuoteRequestStats } from '../services/api';
import { STATUS_CHART_META, STATUS_COUNT_KEYS } from '../constants';
import type { StatusCounts } from '../types';

type Period = 'WEEK' | 'MONTH';

const EMPTY_COUNTS: StatusCounts = { total: 0, pending: 0, processing: 0, needMoreInfo: 0, quoted: 0, rejected: 0, closed: 0 };

const STATUS_ITEMS: { key: keyof StatusCounts; value: string; label: string; color: string }[] = STATUS_CHART_META
  .map((s) => ({ key: STATUS_COUNT_KEYS[s.value] as keyof StatusCounts, value: s.value, label: s.label, color: s.color }));

interface SaleStatusStatsGridProps {
  // Bấm vào 1 ô trạng thái — điều hướng sang trang danh sách, lọc sẵn theo trạng thái đó
  onSelectStatus?: (status: string) => void;
}

export const SaleStatusStatsGrid: React.FC<SaleStatusStatsGridProps> = ({ onSelectStatus }) => {
  const [period, setPeriod] = React.useState<Period>('WEEK');
  const [current, setCurrent] = React.useState<StatusCounts>(EMPTY_COUNTS);
  const [previous, setPrevious] = React.useState<StatusCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const currentRange = period === 'WEEK' ? 'THIS_WEEK' : 'THIS_MONTH';
    const previousRange = period === 'WEEK' ? 'LAST_WEEK' : 'LAST_MONTH';

    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchQuoteRequestStats({ timeRange: currentRange }),
      fetchQuoteRequestStats({ timeRange: previousRange }),
    ])
      .then(([currRes, prevRes]) => {
        if (cancelled) return;
        setCurrent(currRes?.counts || EMPTY_COUNTS);
        setPrevious(prevRes?.counts || EMPTY_COUNTS);
      })
      .catch((err) => console.error('Lỗi tải thống kê trạng thái:', err))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [period]);

  const renderChange = (currVal: number, prevVal: number) => {
    if (prevVal === 0) {
      if (currVal === 0) return <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>0%</span>;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
          <Sparkles size={11} /> Mới
        </span>
      );
    }
    const pct = Math.round(((currVal - prevVal) / prevVal) * 100);
    const isUp = pct > 0;
    const isFlat = pct === 0;
    const color = isFlat ? '#94a3b8' : isUp ? '#16a34a' : '#dc2626';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 800, color }}>
        {!isFlat && (isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        {isUp ? '+' : ''}{pct}%
      </span>
    );
  };

  const periodLabel = period === 'WEEK' ? 'tuần trước' : 'tháng trước';

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Số lượng yêu cầu theo trạng thái
        </h2>
        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setPeriod('WEEK')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: period === 'WEEK' ? '#e2e8f0' : '#ffffff', color: period === 'WEEK' ? '#0f172a' : '#64748b',
            }}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => setPeriod('MONTH')}
            style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: period === 'MONTH' ? '#e2e8f0' : '#ffffff', color: period === 'MONTH' ? '#0f172a' : '#64748b',
            }}
          >
            Tháng
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {STATUS_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => onSelectStatus?.(item.value)}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              cursor: onSelectStatus ? 'pointer' : 'default',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>
              {item.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}>
              {current[item.key]}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {renderChange(current[item.key] ?? 0, previous[item.key] ?? 0)}
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>so với {periodLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
