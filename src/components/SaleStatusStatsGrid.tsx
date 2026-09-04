import React from 'react';
import clsx from 'clsx';
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
      if (currVal === 0) return <span className="text-[11px] font-bold text-[#94a3b8]">0%</span>;
      return (
        <span className="inline-flex items-center gap-[3px] text-[11px] font-extrabold text-[#2563eb]">
          <Sparkles size={11} /> Mới
        </span>
      );
    }
    const pct = Math.round(((currVal - prevVal) / prevVal) * 100);
    const isUp = pct > 0;
    const isFlat = pct === 0;
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-[3px] text-[11px] font-extrabold",
          isFlat ? "text-[#94a3b8]" : isUp ? "text-[#16a34a]" : "text-[#dc2626]"
        )}
      >
        {!isFlat && (isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
        {isUp ? '+' : ''}{pct}%
      </span>
    );
  };

  const periodLabel = period === 'WEEK' ? 'tuần trước' : 'tháng trước';

  return (
    <div
      className={clsx(
        "bg-white border border-[#e2e8f0] rounded-[14px] p-[20px] transition-opacity duration-150 ease-[ease]",
        loading ? "opacity-60" : "opacity-100"
      )}
    >
      <div className="flex items-center justify-between mb-[16px]">
        <h2 className="text-[14px] font-extrabold text-[#0f172a] m-0">
          Số lượng yêu cầu theo trạng thái
        </h2>
        <div className="flex border border-[#cbd5e1] rounded-[8px] overflow-hidden">
          <button
            type="button"
            onClick={() => setPeriod('WEEK')}
            className={clsx(
              "px-[14px] py-[6px] text-[12px] font-bold border-none cursor-pointer",
              period === 'WEEK' ? "bg-[#e2e8f0] text-[#0f172a]" : "bg-white text-[#64748b]"
            )}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => setPeriod('MONTH')}
            className={clsx(
              "px-[14px] py-[6px] text-[12px] font-bold border-none cursor-pointer",
              period === 'MONTH' ? "bg-[#e2e8f0] text-[#0f172a]" : "bg-white text-[#64748b]"
            )}
          >
            Tháng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[12px]">
        {STATUS_ITEMS.map((item) => (
          <div
            key={item.key}
            onClick={() => onSelectStatus?.(item.value)}
            className={clsx(
              "bg-white border border-[#e2e8f0] rounded-[10px] p-[14px]",
              onSelectStatus ? "cursor-pointer" : "cursor-default"
            )}
          >
            <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-[0.3px] mb-[6px]">
              {item.label}
            </div>
            <div className="text-[24px] font-black text-[#0f172a] mb-[4px]">
              {current[item.key]}
            </div>
            <div className="flex items-center gap-[5px]">
              {renderChange(current[item.key] ?? 0, previous[item.key] ?? 0)}
              <span className="text-[10.5px] text-[#94a3b8]">so với {periodLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
