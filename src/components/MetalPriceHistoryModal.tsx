import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, History, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchBaseMetalHistory } from '../services/api';
import type { BaseMetal, BaseMetalPriceHistoryItem } from '../types';
import { formatCurrency } from '../utils/currency';

const TREND_UP = '#16a34a';
const TREND_DOWN = '#dc2626';
const TREND_FLAT = '#64748b';

// Rút gọn số tiền cho trục Y (vd 2.500.000 -> 2,5tr) — trục dài dễ đè lên nhau nếu để nguyên.
function formatCompactVnd(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

interface MetalPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseMetals: BaseMetal[];
}

const dateInputStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
};

type QuickRange = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL';

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: 'TODAY', label: 'Ngày' },
  { value: 'THIS_WEEK', label: 'Tuần' },
  { value: 'THIS_MONTH', label: 'Tháng' },
  { value: 'ALL', label: 'Tất cả' },
];

// YYYY-MM-DD theo giờ LOCAL — không dùng toISOString() vì nó quy về UTC, lệch ngày ở giờ VN.
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Thứ 2 đầu tuần — khớp cách tính THIS_WEEK bên backend (quote-filter.util.ts).
function computeQuickRange(range: QuickRange): { start: string; end: string } {
  const now = new Date();
  if (range === 'TODAY') {
    return { start: fmtDate(now), end: fmtDate(now) };
  }
  if (range === 'THIS_WEEK') {
    const day = now.getDay() || 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    return { start: fmtDate(monday), end: fmtDate(now) };
  }
  if (range === 'THIS_MONTH') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmtDate(first), end: fmtDate(now) };
  }
  return { start: '', end: '' };
}

// Tooltip biểu đồ — ngày và giờ tách 2 dòng, giá ghi rõ "Giá", kèm % tăng/giảm so với điểm trước.
const PriceTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload as { time: string; price: number; deltaPct: number | null };
  const d = new Date(pt.time);
  const delta = pt.deltaPct;
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ fontWeight: 800, color: '#0f172a' }}>{d.toLocaleDateString('vi-VN')}</div>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{d.toLocaleTimeString('vi-VN')}</div>
      <div style={{ fontWeight: 700, color: '#0f172a' }}>Giá: {formatCurrency(pt.price)}</div>
      {delta != null && Math.abs(delta) >= 0.005 && (
        <div style={{ fontSize: '11.5px', fontWeight: 700, color: delta > 0 ? TREND_UP : TREND_DOWN }}>
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}%
        </div>
      )}
    </div>
  );
};

export const MetalPriceHistoryModal: React.FC<MetalPriceHistoryModalProps> = ({ isOpen, onClose, baseMetals }) => {
  const [rows, setRows] = useState<BaseMetalPriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chỉ xem 1 kim loại/lần — không còn chế độ "Tất cả" gộp chung, dễ nhìn xu hướng hơn là
  // 3 đường chồng lên nhau. metalFilter luôn là 1 baseMetal.id cụ thể.
  const [metalFilter, setMetalFilter] = useState('');
  const [quickRange, setQuickRange] = useState<QuickRange | null>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => computeQuickRange('THIS_MONTH').start);
  const [endDate, setEndDate] = useState(() => computeQuickRange('THIS_MONTH').end);

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range);
    const { start, end } = computeQuickRange(range);
    setStartDate(start);
    setEndDate(end);
  };

  // Mặc định chọn kim loại đầu tiên khi mở modal (hoặc khi danh sách kim loại vừa tải xong).
  useEffect(() => {
    if (!isOpen) return;
    if (!metalFilter || !baseMetals.some((m) => m.id === metalFilter)) {
      setMetalFilter(baseMetals[0]?.id || '');
    }
  }, [isOpen, baseMetals, metalFilter]);

  // Gọi 1 lần cho CẢ 3 kim loại (bỏ baseMetalId, limit đủ lớn cho tổng 3 kim loại) thay vì gọi lại
  // API mỗi lần đổi tab — trước đây đổi tab Vàng/Bạc/Bạch kim là phải chờ loading lại từ đầu.
  // Lọc theo kim loại đang chọn làm ở client (filteredRows bên dưới).
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchBaseMetalHistory(undefined, 600)
      .then((data: BaseMetalPriceHistoryItem[]) => setRows(Array.isArray(data) ? data : []))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setMetalFilter('');
      applyQuickRange('THIS_MONTH');
    }
  }, [isOpen]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.baseMetalId !== metalFilter) return false;
      const day = r.createdAt.slice(0, 10);
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [rows, metalFilter, startDate, endDate]);

  // 1 điểm/lần đổi giá của kim loại đang chọn, theo thứ tự thời gian tăng dần (API trả về mới nhất
  // trước). Nếu lần đổi giá gần nhất lại khá cũ so với khoảng đang lọc (ít đổi giá), thêm 1 điểm
  // cuối tại rìa phải (hết khoảng ngày đang lọc, hoặc hiện tại nếu chọn "Tất cả") mang giá gần nhất,
  // để đường luôn kéo dài hết biểu đồ thay vì dừng cụt giữa chừng.
  const chartData = useMemo(() => {
    const data = [...filteredRows].reverse().map((r) => ({ time: r.createdAt, price: r.priceVnd }));
    const endTime = endDate ? new Date(`${endDate}T23:59:59`).toISOString() : new Date().toISOString();
    const last = data[data.length - 1];
    if (last && last.time !== endTime) {
      data.push({ time: endTime, price: last.price });
    }
    // % tăng/giảm so với điểm liền trước — hiện trong tooltip.
    return data.map((pt, i) => {
      const prev = data[i - 1];
      const deltaPct =
        prev && prev.price > 0 ? ((pt.price - prev.price) / prev.price) * 100 : null;
      return { ...pt, deltaPct };
    });
  }, [filteredRows, endDate]);

  // Trục Y zoom vào đúng khoảng giá đang có (như biểu đồ chứng khoán) thay vì luôn bắt đầu từ 0 —
  // bắt đầu từ 0 thì dao động giá thật (thường chỉ vài %) nhìn phẳng lì không thấy gì.
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) return undefined;
    const values = chartData.map((d) => d.price);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max((max - min) * 0.15, max * 0.01, 1000);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [chartData]);

  // Giá hiện tại + % thay đổi so với điểm đầu khoảng đang lọc — để hiện kiểu "ticker" đầu biểu đồ.
  const trend = useMemo(() => {
    if (chartData.length === 0) return null;
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    const color = changePct > 0.005 ? TREND_UP : changePct < -0.005 ? TREND_DOWN : TREND_FLAT;
    return { last, changePct, color };
  }, [chartData]);

  if (!isOpen) return null;

  // Render qua portal thẳng ra document.body — nếu để lồng trong cây trang bình thường thì
  // .page-transition (App.tsx, animation transform: translateY() fill-mode forwards) biến thành
  // containing block cho mọi phần tử position:fixed bên trong nó, khiến modal-backdrop "fixed"
  // bám theo trang bị cuộn thay vì bám màn hình thật — cuộn trang xuống rồi mở modal là bị lệch/xén.
  return createPortal(
    <div className="modal-backdrop show" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '880px', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-header" style={{ background: '#0c1542', flexShrink: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: 'white' }}><History size={18}/>Lịch Sử Giá Kim Loại</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Bộ lọc — filter nhanh Ngày/Tuần/Tháng, khoảng ngày tùy chọn — chung 1 hàng.
            Chọn kim loại chuyển hẳn xuống tab góc phải biểu đồ, khỏi trùng 2 chỗ. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '14px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {QUICK_RANGES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => applyQuickRange(opt.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: quickRange === opt.value ? '#0f172a' : '#f1f5f9',
                  color: quickRange === opt.value ? '#ffffff' : '#64748b',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => { setStartDate(e.target.value); setQuickRange(null); }}
            style={dateInputStyle}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>đến</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => { setEndDate(e.target.value); setQuickRange(null); }}
            style={dateInputStyle}
          />

          {quickRange !== 'THIS_MONTH' && (
            <button
              type="button"
              onClick={() => applyQuickRange('THIS_MONTH')}
              style={{ background: 'transparent', border: 'none', color: '#b91c1c', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Biểu đồ kiểu chứng khoán — giá lớn + % thay đổi kiểu ticker, tab đổi kim loại nhanh góc phải,
            Area gradient, trục Y zoom theo khoảng giá (không ép về 0) để thấy rõ dao động thật. */}
        {!loading && !error && chartData.length > 0 && trend && (
          <div style={{ padding: '16px 20px 4px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {baseMetals.find((m) => m.id === metalFilter)?.name || ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(trend.last)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12.5px', fontWeight: 700, color: trend.color }}>
                    {trend.changePct > 0.005 ? <ArrowUp size={13} /> : trend.changePct < -0.005 ? <ArrowDown size={13} /> : null}
                    {trend.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Chọn nhanh kim loại — góc phải biểu đồ */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {baseMetals.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetalFilter(m.id)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: metalFilter === m.id ? '#0f172a' : '#f1f5f9',
                      color: metalFilter === m.id ? '#ffffff' : '#64748b',
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={formatCompactVnd}
                  tick={{ fontSize: 10.5, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<PriceTooltip />} />
                <Area
                  type="linear"
                  dataKey="price"
                  stroke={trend.color}
                  strokeWidth={2}
                  fill="none"
                  dot={{ r: 3, fill: trend.color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="modal-body" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 0, display: 'block' }}>
          {loading && <p style={{ fontSize: '12.5px', color: '#64748b', padding: '20px' }}>Đang tải...</p>}
          {error && <p style={{ fontSize: '12.5px', color: '#dc2626', padding: '20px' }}>{error}</p>}
          {!loading && !error && filteredRows.length === 0 && (
            <p style={{ fontSize: '12.5px', color: '#94a3b8', padding: '20px' }}>Không có lịch sử thay đổi giá phù hợp bộ lọc.</p>
          )}
          {!loading && !error && filteredRows.length > 0 && (
            <table style={{ width: '100%', minWidth: '620px', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '27%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'left', padding: '10px 20px', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Kim loại</th>
                  <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'right', padding: '10px 12px', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Giá</th>
                  <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'right', padding: '10px 12px', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Thay đổi</th>
                  <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'left', padding: '10px 12px', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Thời gian</th>
                  <th style={{ position: 'sticky', top: 0, background: '#f8fafc', textAlign: 'left', padding: '10px 20px', fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Người cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 20px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.baseMetalName}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>{formatCurrency(r.priceVnd)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {r.changePct != null && r.changePct !== 0 ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11.5px', fontWeight: 700,
                          color: r.changePct > 0 ? '#16a34a' : '#dc2626',
                        }}>
                          {r.changePct > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          {Math.abs(r.changePct)}%
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '11.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '10px 20px', color: '#94a3b8', fontSize: '11.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.updatedByName || 'Hệ thống'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
