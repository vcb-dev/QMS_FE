import React from 'react';
import type { QuoteRequest, Role } from '../types';
import { ArrowRight, Calendar, FilePlus, Clock, CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { UI_CONSTANTS } from '../constants';
import { fetchQuoteRequests } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { SaleStatusStatsGrid } from './SaleStatusStatsGrid';


interface DashboardViewProps {
  requests: QuoteRequest[];
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    needMoreInfo: number;
    xong: number;
    tuChoi: number;
  };
  currentRole: Role;
  onSelectReq: (id: string) => void;
  onViewAll: () => void;
  onOpenLibrary: () => void;
  onOpenCreateModal?: () => void;
  onFilterChange?: (filter: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  requests: initialRequests,
  counts: initialCounts,
  currentRole,
  onSelectReq,
  onViewAll,
  onOpenLibrary,
  onOpenCreateModal: _onOpenCreateModal,
  onFilterChange: _onFilterChange,
}) => {
  const [timeRange, setTimeRange] = React.useState<string>('THIS_MONTH');
  const [chartStatusFilter, setChartStatusFilter] = React.useState<string>('ALL');
  const [counts, setCounts] = React.useState(initialCounts);
  const [apiRequests, setApiRequests] = React.useState<QuoteRequest[]>(initialRequests);
  const [loadingStats, setLoadingStats] = React.useState<boolean>(false);

  // Fetch real counts & request items from backend API when timeRange changes
  const handleTimeRangeChange = async (newRange: string) => {
    setTimeRange(newRange);
    setLoadingStats(true);
    try {
      const res = await fetchQuoteRequests({
        timeRange: newRange,
        includeCounts: true,
        limit: 500,
      });
      if (res.meta?.counts) {
        setCounts(res.meta.counts);
      }
      if (res.data) {
        setApiRequests(res.data);
      }
    } catch (err) {
      console.error('Error fetching stats count from backend API:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // On mount, self-fetch THIS_MONTH stats — initialCounts/initialRequests from
  // the parent are unfiltered (all-time) data and must not be shown as "Tháng này"
  React.useEffect(() => {
    handleTimeRangeChange('THIS_MONTH');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper calculation for daily / monthly timeline chart data
  const timelineChartData = React.useMemo(() => {
    const now = new Date();
    const map = new Map<string, {
      key: string;
      label: string;
      ycMoi: number;
      dangXly: number;
      needMoreInfo: number;
      xong: number;
      tuChoi: number;
      total: number;
      value: number;
    }>();
    const buckets: any[] = [];

    const increment = (b: any, status: string) => {
      b.total += 1;
      if (status === 'YC_MOI') b.ycMoi += 1;
      else if (status === 'DANG_XLY') b.dangXly += 1;
      else if (status === 'NEED_MORE_INFO') b.needMoreInfo += 1;
      else if (status === 'XONG') b.xong += 1;
      else if (status === 'TU_CHOI') b.tuChoi += 1;
    };

    if (timeRange === 'TODAY') {
      const slots = [
        { label: '00-03h' },
        { label: '03-06h' },
        { label: '06-09h' },
        { label: '09-12h' },
        { label: '12-15h' },
        { label: '15-18h' },
        { label: '18-21h' },
        { label: '21-24h' },
      ];
      slots.forEach((s) => {
        const b = { key: s.label, label: s.label, ycMoi: 0, dangXly: 0, needMoreInfo: 0, xong: 0, tuChoi: 0, total: 0, value: 0 };
        map.set(s.label, b);
        buckets.push(b);
      });

      apiRequests.forEach((r) => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const hour = d.getHours();
        const slotIdx = Math.min(Math.floor(hour / 3), 7);
        const b = buckets[slotIdx];
        if (b) increment(b, r.status);
      });
    } else if (timeRange === 'THIS_WEEK') {
      const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
      const currentDay = now.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const label = `${dayNames[i]} (${dd}/${mm})`;
        const b = { key, label, ycMoi: 0, dangXly: 0, needMoreInfo: 0, xong: 0, tuChoi: 0, total: 0, value: 0 };
        map.set(key, b);
        buckets.push(b);
      }

      apiRequests.forEach((r) => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const b = map.get(key);
        if (b) increment(b, r.status);
      });
    } else if (timeRange === 'THIS_MONTH' || timeRange === 'LAST_MONTH') {
      const targetMonthDate = timeRange === 'LAST_MONTH'
        ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const year = targetMonthDate.getFullYear();
      const month = targetMonthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(i).padStart(2, '0');
        const key = `${year}-${mm}-${dd}`;
        const label = `${dd}/${mm}`;
        const b = { key, label, ycMoi: 0, dangXly: 0, needMoreInfo: 0, xong: 0, tuChoi: 0, total: 0, value: 0 };
        map.set(key, b);
        buckets.push(b);
      }

      apiRequests.forEach((r) => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const key = `${yyyy}-${mm}-${dd}`;
        const b = map.get(key);
        if (b) increment(b, r.status);
      });
    } else if (timeRange === 'THIS_YEAR') {
      const year = now.getFullYear();
      for (let i = 0; i < 12; i++) {
        const mm = String(i + 1).padStart(2, '0');
        const key = `${year}-${mm}`;
        const label = `Thg ${i + 1}`;
        const b = { key, label, ycMoi: 0, dangXly: 0, needMoreInfo: 0, xong: 0, tuChoi: 0, total: 0, value: 0 };
        map.set(key, b);
        buckets.push(b);
      }

      apiRequests.forEach((r) => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const b = map.get(key);
        if (b) increment(b, r.status);
      });
    } else {
      // ALL: Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const label = `Thg ${d.getMonth() + 1}/${yyyy.toString().slice(-2)}`;
        const b = { key, label, ycMoi: 0, dangXly: 0, needMoreInfo: 0, xong: 0, tuChoi: 0, total: 0, value: 0 };
        map.set(key, b);
        buckets.push(b);
      }

      apiRequests.forEach((r) => {
        if (!r.createdAt) return;
        const d = new Date(r.createdAt);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const b = map.get(key);
        if (b) increment(b, r.status);
      });
    }

    return buckets.map((b) => {
      let val = b.total;
      if (chartStatusFilter === 'YC_MOI') val = b.ycMoi;
      else if (chartStatusFilter === 'DANG_XLY') val = b.dangXly;
      else if (chartStatusFilter === 'NEED_MORE_INFO') val = b.needMoreInfo;
      else if (chartStatusFilter === 'XONG') val = b.xong;
      else if (chartStatusFilter === 'TU_CHOI') val = b.tuChoi;

      return {
        ...b,
        value: val,
      };
    });
  }, [apiRequests, timeRange, chartStatusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'YC_MOI': return '#3b82f6';
      case 'DANG_XLY': return '#f59e0b';
      case 'NEED_MORE_INFO': return '#f97316';
      case 'XONG': return '#22c55e';
      case 'TU_CHOI': return '#ef4444';
      default: return '#2563eb';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'YC_MOI': return 'Mới tạo';
      case 'DANG_XLY': return 'Đang xử lý';
      case 'NEED_MORE_INFO': return 'Cần bổ sung';
      case 'XONG': return 'Hoàn thành';
      case 'TU_CHOI': return 'Từ chối';
      default: return 'Tất cả trạng thái';
    }
  };


  const recentRequests = React.useMemo(() => {
    return apiRequests.slice(0, 5);
  }, [apiRequests]);

  const completedProducts = React.useMemo(() => {
    return apiRequests.filter((r) => r.status === 'XONG' || r.quotedPrice);
  }, [apiRequests]);

  const getStatusPill = (status: string) => {
    switch (status) {
      case 'YC_MOI':
        return <span className="status-pill new" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}><FilePlus size={12} /> MỚI</span>;
      case 'DANG_XLY':
        return <span className="status-pill process" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}><Clock size={12} /> ĐANG XỬ LÝ</span>;
      case 'XONG':
        return <span className="status-pill done" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}><CheckCircle size={12} /> ĐÃ BÁO GIÁ</span>;
      case 'TU_CHOI':
        return <span className="status-pill reject" style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}><XCircle size={12} /> TỪ CHỐI</span>;
      case 'NEED_MORE_INFO':
        return <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}><RotateCcw size={12} /> CẦN BỔ SUNG</span>;
      case 'DA_CHOT':
        return <span className="status-pill closed" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}><Award size={12} /> ĐÃ CHỐT</span>;
      default:
        return <span className="status-pill new">{status}</span>;
    }
  };

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return 'Gần đây';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
      if (diffHours < 1) return 'Vừa xong';
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffHours < 48) return 'Hôm qua';
      return `${Math.floor(diffHours / 24)} ngày trước`;
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Tổng quan
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            {timeRange === 'THIS_MONTH' && 'Hoạt động trong tháng này'}
            {timeRange === 'TODAY' && 'Hoạt động trong hôm nay'}
            {timeRange === 'THIS_WEEK' && 'Hoạt động trong tuần này'}
            {timeRange === 'LAST_MONTH' && 'Hoạt động trong tháng trước'}
            {timeRange === 'THIS_YEAR' && 'Hoạt động trong năm nay'}
            {timeRange === 'ALL' && 'Tất cả hoạt động báo giá'}
          </p>
        </div>

        {currentRole !== 'SALE' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Time Range Filter Select Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={14} style={{ position: 'absolute', left: '12px', color: '#64748b', pointerEvents: 'none' }} />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px 8px 32px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'auto',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              }}
            >
              <option value="THIS_MONTH">Tháng này</option>
              <option value="TODAY">Hôm nay</option>
              <option value="THIS_WEEK">Tuần này</option>
              <option value="LAST_MONTH">Tháng trước</option>
              <option value="THIS_YEAR">Năm nay</option>
              <option value="ALL">Tất cả thời gian</option>
            </select>
          </div>
        </div>
        )}
      </div>

      {/* 3. Charts Row — SALE thấy ô số liệu theo trạng thái, không thấy biểu đồ */}
      {currentRole === 'SALE' ? (
        <SaleStatusStatsGrid />
      ) : (() => {
        const chartData = [
          { name: 'Mới tạo',     value: counts.ycMoi,        fill: '#3b82f6' },
          { name: 'Đang xử lý',  value: counts.dangXly,      fill: '#f59e0b' },
          { name: 'Cần bổ sung', value: counts.needMoreInfo,  fill: '#f97316' },
          { name: 'Hoàn thành',  value: counts.xong,         fill: '#22c55e' },
          { name: 'Từ chối',     value: counts.tuChoi,        fill: '#ef4444' },
        ];

        const CustomDonutLabel = ({ cx, cy }: any) => (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 26, fontWeight: 900, fill: '#0f172a' }}>
              {counts.total}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8', letterSpacing: 1 }}>
              YÊU CẦU
            </text>
          </>
        );

        const DonutTooltipContent = ({ active, payload }: any) => {
          if (!active || !payload?.length) return null;
          const d = payload[0];
          const pct = counts.total > 0 ? ((d.value / counts.total) * 100).toFixed(1) : '0';
          return (
            <div style={{ background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ color: d.payload.fill, marginBottom: 2 }}>● {d.name}</div>
              <div>{d.value} yêu cầu <span style={{ color: '#94a3b8' }}>({pct}%)</span></div>
            </div>
          );
        };

        const TimelineTooltipContent = ({ active, payload, label }: any) => {
          if (!active || !payload?.length) return null;
          const dataItem = payload[0].payload;

          if (chartStatusFilter === 'ALL') {
            return (
              <div style={{ background: '#0f172a', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', minWidth: '150px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: 4, marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontWeight: 900, marginBottom: 6, color: '#38bdf8' }}>
                  Tổng số: {dataItem.total} yêu cầu
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5 }}>
                  <div style={{ color: '#60a5fa' }}>● Mới tạo: {dataItem.ycMoi}</div>
                  <div style={{ color: '#fbbf24' }}>● Đang xử lý: {dataItem.dangXly}</div>
                  <div style={{ color: '#fb923c' }}>● Cần bổ sung: {dataItem.needMoreInfo}</div>
                  <div style={{ color: '#4ade80' }}>● Hoàn thành: {dataItem.xong}</div>
                  <div style={{ color: '#f87171' }}>● Từ chối: {dataItem.tuChoi}</div>
                </div>
              </div>
            );
          }

          const selectedVal = dataItem.value;
          return (
            <div style={{ background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
              <div style={{ color: getStatusColor(chartStatusFilter) }}>
                ● {getStatusLabel(chartStatusFilter)}: {selectedVal} yêu cầu
              </div>
            </div>
          );
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: loadingStats ? 0.5 : 1, transition: 'opacity 0.15s ease', pointerEvents: loadingStats ? 'none' : 'auto' }}>

            {/* Donut Chart */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
                Phân bố trạng thái yêu cầu
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                        label={<CustomDonutLabel />}
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={700}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {chartData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.fill, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar Chart - Timeline Comparison */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {timeRange === 'THIS_YEAR' || timeRange === 'ALL' ? 'So sánh số lượng hàng tháng' : 'So sánh số lượng hàng ngày'}
                  </h2>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {timeRange === 'TODAY' && 'Theo khung giờ trong ngày'}
                    {timeRange === 'THIS_WEEK' && 'Theo các ngày trong tuần'}
                    {timeRange === 'THIS_MONTH' && 'Theo ngày trong tháng này'}
                    {timeRange === 'LAST_MONTH' && 'Theo ngày trong tháng trước'}
                    {timeRange === 'THIS_YEAR' && 'Theo các tháng trong năm'}
                    {timeRange === 'ALL' && 'Theo 12 tháng gần nhất'}
                  </span>
                </div>

                {/* Status Filter Dropdown inside Chart Header */}
                <select
                  value={chartStatusFilter}
                  onChange={(e) => setChartStatusFilter(e.target.value)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#334155',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="YC_MOI">Mới tạo</option>
                  <option value="DANG_XLY">Đang xử lý</option>
                  <option value="NEED_MORE_INFO">Cần bổ sung</option>
                  <option value="XONG">Hoàn thành</option>
                  <option value="TU_CHOI">Từ chối</option>
                </select>
              </div>

              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={timelineChartData} margin={{ top: 18, right: 10, left: -20, bottom: 4 }} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={timeRange === 'THIS_MONTH' || timeRange === 'LAST_MONTH' ? 2 : 0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10.5, fill: '#cbd5e1' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TimelineTooltipContent />} cursor={{ fill: '#f8fafc', radius: 6 }} />

                  {chartStatusFilter === 'ALL' ? (
                    <>
                      <Bar dataKey="ycMoi" stackId="a" fill="#3b82f6" name="Mới tạo" />
                      <Bar dataKey="dangXly" stackId="a" fill="#f59e0b" name="Đang xử lý" />
                      <Bar dataKey="needMoreInfo" stackId="a" fill="#f97316" name="Cần bổ sung" />
                      <Bar dataKey="xong" stackId="a" fill="#22c55e" name="Hoàn thành" />
                      <Bar dataKey="tuChoi" stackId="a" fill="#ef4444" name="Từ chối" radius={[4, 4, 0, 0]} />
                    </>
                  ) : (
                    <Bar dataKey="value" fill={getStatusColor(chartStatusFilter)} radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10.5, fontWeight: 900, fill: '#0f172a' }} formatter={(v: any) => (v > 0 ? v : '')} />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        );
      })()}
      {/* 4. Split Content Layout */}


      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
        {/* Left 2/3: Yêu cầu gần đây */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Yêu cầu gần đây
            </h2>
            <button
              type="button"
              onClick={onViewAll}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>MÃ YC / KHÁCH HÀNG</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>SẢN PHẨM</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>NGÀY TẠO</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length > 0 ? (
                  recentRequests.map((r) => {
                    const rawImg = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
                    const imgUrl = rawImg || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => onSelectReq(r.id)}
                        style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer' }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                            {r.code || `#${r.id}`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {r.customerName || r.requester?.name || 'Khách hàng'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={imgUrl}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                              }}
                              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                            />
                            <span style={{ fontWeight: 700, color: '#1e293b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.productName}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', color: '#64748b', fontSize: '12px' }}>
                          {formatDateLabel(r.createdAt)}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          {getStatusPill(r.status)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                      Chưa có yêu cầu nào gần đây
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1/3: Sản phẩm nổi bật */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Sản phẩm nổi bật
            </h2>
            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Thư viện <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {completedProducts.length > 0 ? (
              completedProducts.slice(0, 4).map((r) => {
                const rawImg = r.images && r.images.length > 0 ? r.images[0].imageUrl : null;
                const imgUrl = rawImg || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
                const formattedPrice = priceVal > 0 ? formatCurrency(priceVal) : '---';

                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectReq(r.id)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                    }}
                    className="product-card-hover"
                  >
                    <div style={{ width: '100%', height: '95px', background: '#f8fafc' }}>
                      <img
                        src={imgUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.productName}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                        {formattedPrice}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ gridColumn: '1 / -1', color: '#94a3b8', fontSize: '12.5px', textAlign: 'center', padding: '24px 0' }}>
                Chưa có sản phẩm nổi bật
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
