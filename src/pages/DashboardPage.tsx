import React from 'react';
import type { QuoteRequest ,DashboardPageProps, DashboardChartsResponse} from '../types';
import { ArrowRight, Calendar } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { UI_CONSTANTS, STATUS_CHART_META } from '../constants';
import { StatusPill } from '../components/StatusPill';
import { ChartTooltip } from '../components/ChartTooltip';
import { DistributionPieCard } from '../components/DistributionPieCard';
import { cardStyle } from '../styles/card';
import { fetchQuoteRequests, fetchQuoteRequestStats, fetchDashboardCharts } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { SaleStatusStatsGrid } from '../components/SaleStatusStatsGrid';

// Bảng màu cho biểu đồ phân bố (danh mục/chất liệu) — hằng số tĩnh, đặt ở scope file để
// không bị cấp phát lại mỗi lần component render (tránh cảnh báo thiếu dependency ở useMemo).
const CATEGORY_COLORS = ['#2563eb', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#84cc16'];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  requests: initialRequests,
  counts: initialCounts,
  currentRole,
  onSelectReq,
  onOpenCreateModal: _onOpenCreateModal,
  onFilterStatus,
}) => {
  const navigate = useNavigate();
  const onViewAll = () => navigate('/requests');
  const onOpenLibrary = () => navigate('/library');

  const [timeRange, setTimeRange] = React.useState<string>('THIS_MONTH');
  const [chartStatusFilter, setChartStatusFilter] = React.useState<string>('ALL');
  const [counts, setCounts] = React.useState(initialCounts);
  const [apiRequests, setApiRequests] = React.useState<QuoteRequest[]>(initialRequests);
  const [loadingStats, setLoadingStats] = React.useState<boolean>(false);
  const [prevStats, setPrevStats] = React.useState<{ total: number; closeRate: number; closedRevenue: number; quotedRevenue: number } | null>(null);
  const [charts, setCharts] = React.useState<DashboardChartsResponse | null>(null);

  // Kỳ trước để so sánh % — TODAY→hôm qua, THIS_WEEK→tuần trước, THIS_MONTH→tháng trước,
  // LAST_MONTH→tháng trước nữa, THIS_YEAR→năm trước. ALL không có kỳ trước để so sánh.
  const getPreviousPeriodQuery = (range: string): { timeRange?: string; startDate?: string; endDate?: string } | null => {
    const now = new Date();
    switch (range) {
      case 'TODAY': {
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return {
          startDate: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0).toISOString(),
          endDate: new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59).toISOString(),
        };
      }
      case 'THIS_WEEK':
        return { timeRange: 'LAST_WEEK' };
      case 'THIS_MONTH':
        return { timeRange: 'LAST_MONTH' };
      case 'LAST_MONTH':
        return {
          startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0).toISOString(),
          endDate: new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59).toISOString(),
        };
      case 'THIS_YEAR':
        return {
          startDate: new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0).toISOString(),
          endDate: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString(),
        };
      default:
        return null;
    }
  };

  // Fetch real counts & request items from backend API when timeRange changes
  const handleTimeRangeChange = async (newRange: string) => {
    setTimeRange(newRange);
    setLoadingStats(true);
    try {
      const res = await fetchQuoteRequests({
        timeRange: newRange,
        includeCounts: true,
        limit: 500,
        lite: true,
      });
      if (res.meta?.counts) {
        setCounts(res.meta.counts);
      }
      if (res.data) {
        setApiRequests(res.data);
      }

      if (currentRole !== 'SALE') {
        const chartsRes = await fetchDashboardCharts({ timeRange: newRange });
        setCharts(chartsRes);
      }

      if (currentRole === 'ADMIN') {
        const prevQuery = getPreviousPeriodQuery(newRange);
        if (prevQuery) {
          const prevRes = await fetchQuoteRequestStats(prevQuery);
          setPrevStats(prevRes || null);
        } else {
          setPrevStats(null);
        }
      }
    } catch (err) {
      console.error('Error fetching stats count from backend API:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // On mount, self-fetch THIS_MONTH stats — initialCounts/initialRequests from
  // the parent are unfiltered (all-time) data and must not be shown as "Tháng này".
  // SALE không có bộ lọc thời gian (dropdown ẩn, dùng SaleStatusStatsGrid riêng) nên
  // bỏ qua fetch 500 dòng này, dùng thẳng initialRequests/initialCounts đã có sẵn.
  React.useEffect(() => {
    if (currentRole === 'SALE') return;
    handleTimeRangeChange('THIS_MONTH');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SALE không tự fetch — App.tsx load requests/counts bất đồng bộ nên phải đồng bộ lại
  // mỗi khi props initialRequests/initialCounts đổi (login xong mới có data thật)
  React.useEffect(() => {
    if (currentRole !== 'SALE') return;
    setApiRequests(initialRequests);
    setCounts(initialCounts);
  }, [currentRole, initialRequests, initialCounts]);

  const getStatusColor = (status: string) =>
    STATUS_CHART_META.find((s) => s.value === status)?.color || '#2563eb';

  const getStatusLabel = (status: string) =>
    STATUS_CHART_META.find((s) => s.value === status)?.label || 'Tất cả trạng thái';


  const recentRequests = React.useMemo(() => {
    return apiRequests.slice(0, 5);
  }, [apiRequests]);

  // Doanh thu (Admin Analytics) — tổng tiền đơn đã chốt & tổng tiền đơn đã báo giá (chưa chốt)
  const sumRevenue = (list: QuoteRequest[]) => {
    let closedRevenue = 0;
    let quotedRevenue = 0;
    list.forEach((r) => {
      const price = r.quotedPrice ? Number(r.quotedPrice) : 0;
      if (r.status === 'CLOSED' ) closedRevenue += price;
      else if (r.status === 'QUOTED') quotedRevenue += price;
    });
    return { closedRevenue, quotedRevenue };
  };

  const revenueStats = React.useMemo(() => sumRevenue(apiRequests), [apiRequests]);
  // Kỳ trước lấy thẳng từ API stats (chỉ số tổng hợp), không kéo full list rồi tính tay
  const prevRevenueStats = React.useMemo(
    () => (prevStats ? { closedRevenue: prevStats.closedRevenue, quotedRevenue: prevStats.quotedRevenue } : null),
    [prevStats]
  );

  // 1.3 KPI tổng hợp — tổng số yêu cầu & tỷ lệ chốt trung bình (đã chốt / tổng tạo)
  const sumKpi = (list: QuoteRequest[]) => {
    const total = list.length;
    const closed = list.filter((r) => r.status === 'CLOSED').length;
    const closeRate = total > 0 ? (closed / total) * 100 : 0;
    return { total, closeRate };
  };

  const kpiStats = React.useMemo(() => sumKpi(apiRequests), [apiRequests]);
  const prevKpiStats = React.useMemo(
    () => (prevStats ? { total: prevStats.total, closeRate: prevStats.closeRate } : null),
    [prevStats]
  );

  // Biểu đồ cột Timeline — backend trả về từng bucket với đủ số liệu theo trạng thái
  // (pending/processing/needMoreInfo/quoted/rejected/closed/total) nhưng không có field
  // "value" chung. Khi người dùng lọc theo 1 trạng thái cụ thể, Bar dataKey="value" cần
  // field này được tính từ chartStatusFilter — nếu không bar sẽ luôn rỗng/bằng 0.
  const timelineChartData = React.useMemo(() => {
    return (charts?.timeline || []).map((b) => {
      let val = b.total;
      if (chartStatusFilter === 'PENDING') val = b.pending;
      else if (chartStatusFilter === 'PROCESSING') val = b.processing;
      else if (chartStatusFilter === 'NEED_MORE_INFO') val = b.needMoreInfo;
      else if (chartStatusFilter === 'QUOTED') val = b.quoted;
      else if (chartStatusFilter === 'REJECTED') val = b.rejected;
      else if (chartStatusFilter === 'CLOSED') val = b.closed;
      return { ...b, value: val };
    });
  }, [charts, chartStatusFilter]);

  // % thay đổi so với kỳ trước — null nếu không có kỳ trước hoặc kỳ trước = 0 và kỳ này cũng = 0
  const pctChange = (curr: number, prev: number | undefined): number | 'NEW' | null => {
    if (prev === undefined) return null;
    if (prev === 0) return curr > 0 ? 'NEW' : null;
    return ((curr - prev) / prev) * 100;
  };

  const renderChangeBadge = (curr: number, prev: number | undefined, dark?: boolean) => {
    const change = pctChange(curr, prev);
    if (change === null) return null;
    if (change === 'NEW') {
      return (
        <span style={{ fontSize: '11px', fontWeight: 800, color: dark ? '#4ade80' : '#16a34a' }}>
          Mới so với kỳ trước
        </span>
      );
    }
    const isUp = change >= 0;
    return (
      <span style={{ fontSize: '11px', fontWeight: 800, color: isUp ? (dark ? '#4ade80' : '#16a34a') : (dark ? '#f87171' : '#dc2626') }}>
        {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% so với kỳ trước
      </span>
    );
  };

  // Badge chênh lệch điểm % (dùng cho tỷ lệ chốt — so sánh tuyệt đối, không phải % tương đối)
  const renderPointChangeBadge = (curr: number, prev: number | undefined) => {
    if (prev === undefined) return null;
    const diff = curr - prev;
    if (Math.abs(diff) < 0.05) return <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>Không đổi so với kỳ trước</span>;
    const isUp = diff > 0;
    return (
      <span style={{ fontSize: '11px', fontWeight: 800, color: isUp ? '#16a34a' : '#dc2626' }}>
        {isUp ? '▲' : '▼'} {Math.abs(diff).toFixed(1)} điểm % so với kỳ trước
      </span>
    );
  };

  const STATUS_PILL_LABELS: Record<string, string> = {
    PENDING: 'MỚI TẠO',
    PROCESSING: 'ĐANG XỬ LÝ',
    QUOTED: 'ĐÃ BÁO GIÁ',
    REJECTED: 'TỪ CHỐI',
    NEED_MORE_INFO: 'CẦN BỔ SUNG',
    CLOSED: 'ĐÃ CHỐT',
  };

  const getStatusPill = (status: string) => (
    <StatusPill status={status} label={STATUS_PILL_LABELS[status] || status} iconSize={12} />
  );

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

      {/* 2. KPI tổng hợp + Doanh thu — chỉ Admin xem */}
      {currentRole === 'ADMIN' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tổng số yêu cầu
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {kpiStats.total}
            </div>
            <div style={{ marginTop: '6px' }}>
              {renderChangeBadge(kpiStats.total, prevKpiStats?.total, false)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tỷ lệ chốt trung bình
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {kpiStats.closeRate.toFixed(1)}%
            </div>
            <div style={{ marginTop: '6px' }}>
              {renderPointChangeBadge(kpiStats.closeRate, prevKpiStats?.closeRate)}
            </div>
          </div>
          <div style={{ ...cardStyle, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Doanh thu đã chốt
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#15803d', marginTop: '6px' }}>
              {formatCurrency(revenueStats.closedRevenue)}
            </div>
            <div style={{ marginTop: '6px' }}>
              {renderChangeBadge(revenueStats.closedRevenue, prevRevenueStats?.closedRevenue, false)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Giá trị đơn đã báo giá (chưa chốt)
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {formatCurrency(revenueStats.quotedRevenue)}
            </div>
            <div style={{ marginTop: '6px' }}>
              {renderChangeBadge(revenueStats.quotedRevenue, prevRevenueStats?.quotedRevenue, false)}
            </div>
          </div>
        </div>
      )}

      {/* 3. Charts Row — SALE thấy ô số liệu theo trạng thái, không thấy biểu đồ */}
      {currentRole === 'SALE' ? (
        <SaleStatusStatsGrid onSelectStatus={onFilterStatus} />
      ) : (() => {
        const chartData = [
          { name: 'Mới tạo',     value: counts.pending,        fill: '#3b82f6' },
          { name: 'Đang xử lý',  value: counts.processing,     fill: '#f59e0b' },
          { name: 'Cần bổ sung', value: counts.needMoreInfo,   fill: '#f97316' },
          { name: 'Hoàn thành',  value: counts.quoted,         fill: '#22c55e' },
          { name: 'Từ chối',     value: counts.rejected,       fill: '#ef4444' },
          { name: 'Đã chốt',     value: counts.closed,         fill: '#8b5cf6' },
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
            <ChartTooltip>
              <div style={{ color: d.payload.fill, marginBottom: 2 }}>● {d.name}</div>
              <div>{d.value} yêu cầu <span style={{ color: '#94a3b8' }}>({pct}%)</span></div>
            </ChartTooltip>
          );
        };

        const TimelineTooltipContent = ({ active, payload, label }: any) => {
          if (!active || !payload?.length) return null;
          const dataItem = payload[0].payload;

          if (chartStatusFilter === 'ALL') {
            return (
              <ChartTooltip padding="10px 14px" minWidth="150px">
                <div style={{ fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: 4, marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontWeight: 900, marginBottom: 6, color: '#38bdf8' }}>
                  Tổng số: {dataItem.total} yêu cầu
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5 }}>
                  <div style={{ color: '#60a5fa' }}>● Mới tạo: {dataItem.pending}</div>
                  <div style={{ color: '#fbbf24' }}>● Đang xử lý: {dataItem.processing}</div>
                  <div style={{ color: '#fb923c' }}>● Cần bổ sung: {dataItem.needMoreInfo}</div>
                  <div style={{ color: '#4ade80' }}>● Hoàn thành: {dataItem.quoted}</div>
                  <div style={{ color: '#f87171' }}>● Từ chối: {dataItem.rejected}</div>
                  <div style={{ color: '#a78bfa' }}>● Đã chốt: {dataItem.closed}</div>
                </div>
              </ChartTooltip>
            );
          }

          const selectedVal = dataItem.value;
          return (
            <ChartTooltip>
              <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
              <div style={{ color: getStatusColor(chartStatusFilter) }}>
                ● {getStatusLabel(chartStatusFilter)}: {selectedVal} yêu cầu
              </div>
            </ChartTooltip>
          );
        };

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', opacity: loadingStats ? 0.5 : 1, transition: 'opacity 0.15s ease', pointerEvents: loadingStats ? 'none' : 'auto' }}>

            {/* Donut Chart */}
            <div style={cardStyle}>
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
            <div style={cardStyle}>
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
                  <option value="PENDING">Mới tạo</option>
                  <option value="PROCESSING">Đang xử lý</option>
                  <option value="NEED_MORE_INFO">Cần bổ sung</option>
                  <option value="QUOTED">Hoàn thành</option>
                  <option value="REJECTED">Từ chối</option>
                  <option value="CLOSED">Đã chốt</option>
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
                      <Bar dataKey="pending" stackId="a" fill="#3b82f6" name="Mới tạo" />
                      <Bar dataKey="processing" stackId="a" fill="#f59e0b" name="Đang xử lý" />
                      <Bar dataKey="needMoreInfo" stackId="a" fill="#f97316" name="Cần bổ sung" />
                      <Bar dataKey="quoted" stackId="a" fill="#22c55e" name="Hoàn thành" />
                      <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Từ chối" />
                      <Bar dataKey="closed" stackId="a" fill="#8b5cf6" name="Đã chốt" radius={[4, 4, 0, 0]} />
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

      {/* 1.1 Biểu đồ theo Sale — chỉ Admin xem, số yêu cầu tạo & đã chốt của từng Sale */}
      {currentRole === 'ADMIN' && (charts?.saleStats || []).length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Hiệu suất theo Sale
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Số yêu cầu đã tạo và đã chốt của từng Sale (top 8)</span>

          <ResponsiveContainer width="100%" height={Math.max(180, (charts?.saleStats || []).length * 42)}>
            <BarChart
              data={(charts?.saleStats || [])}
              layout="vertical"
              margin={{ top: 14, right: 24, left: 8, bottom: 4 }}
              barCategoryGap="24%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10.5, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const closeRate = d.total > 0 ? ((d.closed / d.total) * 100).toFixed(1) : '0';
                  return (
                    <ChartTooltip>
                      <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                      <div style={{ color: '#38bdf8' }}>● Đã tạo: {d.total}</div>
                      <div style={{ color: '#22c55e' }}>● Đã chốt: {d.closed}</div>
                      <div style={{ color: '#94a3b8', marginTop: 2 }}>Tỷ lệ chốt: {closeRate}%</div>
                    </ChartTooltip>
                  );
                }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Bar dataKey="total" fill="#38bdf8" name="Đã tạo" radius={[0, 4, 4, 0]} />
              <Bar dataKey="closed" fill="#22c55e" name="Đã chốt" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 1.2 Biểu đồ phân bố sản phẩm — chỉ Admin xem, theo danh mục & khoảng giá */}
      {currentRole === 'ADMIN' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <DistributionPieCard title="Phân bố theo danh mục" subtitle="Top 8 danh mục nhiều yêu cầu nhất" data={(charts?.categoryDistribution || []).map((d, idx) => ({ ...d, fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))} />

          <DistributionPieCard title="Phân bố theo chất liệu" subtitle="Top 8 chất liệu nhiều yêu cầu nhất" data={(charts?.materialDistribution || []).map((d, idx) => ({ ...d, fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))} />

          {/* Phân bố theo khoảng giá */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Phân bố theo khoảng giá
            </h2>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Số đơn đã báo giá theo từng khoảng</span>

            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={charts?.priceRangeDistribution || []} margin={{ top: 18, right: 10, left: -20, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltip>
                        <div style={{ color: '#94a3b8' }}>{label}</div>
                        <div style={{ color: '#2563eb' }}>● {payload[0].value} đơn</div>
                      </ChartTooltip>
                    );
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10.5, fontWeight: 900, fill: '#0f172a' }} formatter={(v: any) => (v > 0 ? v : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Split Content Layout — Admin không cần xem, đã có Doanh thu + Hiệu suất theo Sale ở trên */}
      {currentRole !== 'ADMIN' && (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '18px' }}>
        {/* Left 2/3: Yêu cầu gần đây */}
        <div style={cardStyle}>
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
        <div style={cardStyle}>
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
            {(charts?.featuredProducts || []).length > 0 ? (
              (charts?.featuredProducts || []).map((item) => {
                const rawImg = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
                const imgUrl = rawImg || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                const formattedPrice = item.price > 0 ? formatCurrency(item.price) : '---';

                return (
                  <div
                    key={item.key}
                    // Tạm thời disable — không cho bấm vào sản phẩm nổi bật
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'default',
                      transition: 'transform 0.15s ease',
                    }}
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
                        {item.productName}
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
      )}
    </div>
  );
};
