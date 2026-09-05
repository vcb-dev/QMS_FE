import React from 'react';
import type { QuoteRequest ,DashboardPageProps, DashboardChartsResponse} from '../types';
import { ArrowRight, Calendar, LayoutDashboard } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { UI_CONSTANTS, STATUS_CHART_META } from '../constants';
import { StatusPill } from '../components/StatusPill';
import { ChartTooltip } from '../components/ChartTooltip';
import { DistributionPieCard } from '../components/DistributionPieCard';
import { clsx } from 'clsx';
import { cardCls } from '../styles/classNames';
import { fetchQuoteRequests, fetchQuoteRequestStats, fetchDashboardCharts } from '../services/api';
import { formatCurrency } from '../utils/currency';
import { renderPriceBreakdownLines } from '../utils/priceBreakdown';
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
  // Admin: số liệu KPI kỳ hiện tại lấy thẳng từ endpoint /stats (BE cộng bằng SQL) — không kéo
  // cả danh sách đơn về client để cộng tay như trước.
  const [curStats, setCurStats] = React.useState<{ total: number; closeRate: number; closedRevenue: number; quotedRevenue: number } | null>(null);
  const [charts, setCharts] = React.useState<DashboardChartsResponse | null>(null);
  // Đếm request để bỏ qua response trả về trễ (race condition khi đổi mốc thời gian liên tục)
  const timeRangeRequestIdRef = React.useRef(0);

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
    const myRequestId = ++timeRangeRequestIdRef.current;
    setTimeRange(newRange);
    setLoadingStats(true);
    try {
      if (currentRole === 'ADMIN') {
        // Admin chỉ xem card KPI + biểu đồ tổng hợp — không render bảng "Yêu cầu gần đây" /
        // "Sản phẩm nổi bật". Lấy số đã cộng sẵn ở BE (/stats), khỏi kéo cả danh sách đơn về.
        const [curRes, chartsRes] = await Promise.all([
          fetchQuoteRequestStats({ timeRange: newRange }),
          fetchDashboardCharts({ timeRange: newRange }),
        ]);
        const prevQuery = getPreviousPeriodQuery(newRange);
        const prevRes = prevQuery ? await fetchQuoteRequestStats(prevQuery) : null;
        // Bỏ qua nếu đã có request mới hơn được gửi sau request này (kết quả trả về trễ/không theo thứ tự)
        if (myRequestId !== timeRangeRequestIdRef.current) return;
        if (curRes?.counts) setCounts(curRes.counts);
        setCurStats(
          curRes
            ? {
                total: curRes.total,
                closeRate: curRes.closeRate,
                closedRevenue: curRes.closedRevenue,
                quotedRevenue: curRes.quotedRevenue,
              }
            : null,
        );
        setCharts(chartsRes);
        setPrevStats(prevRes || null);
        return;
      }

      // ORDER: chỉ cần 5 dòng cho bảng "Yêu cầu gần đây" + counts cho Sidebar.
      const res = await fetchQuoteRequests({
        timeRange: newRange,
        includeCounts: true,
        limit: 20,
        lite: true,
      });
      const chartsRes = await fetchDashboardCharts({ timeRange: newRange });
      if (myRequestId !== timeRangeRequestIdRef.current) return;
      if (res.meta?.counts) {
        setCounts(res.meta.counts);
      }
      if (res.data) {
        setApiRequests(res.data);
      }
      setCharts(chartsRes);
    } catch (err) {
      console.error('Error fetching stats count from backend API:', err);
    } finally {
      if (myRequestId === timeRangeRequestIdRef.current) {
        setLoadingStats(false);
      }
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

  // SALE bỏ qua handleTimeRangeChange ở effect trên (không có dropdown thời gian) nên charts
  // (Sản phẩm nổi bật, phân bố danh mục/chất liệu...) không bao giờ được fetch nếu thiếu đoạn
  // này — tự fetch riêng 1 lần lúc mount với kỳ mặc định THIS_MONTH.
  React.useEffect(() => {
    if (currentRole !== 'SALE') return;
    fetchDashboardCharts({ timeRange: 'THIS_MONTH' })
      .then(setCharts)
      .catch((err) => console.error('Error fetching dashboard charts for SALE:', err));
  }, [currentRole]);

  const getStatusColor = (status: string) =>
    STATUS_CHART_META.find((s) => s.value === status)?.color || '#2563eb';

  const getStatusLabel = (status: string) =>
    STATUS_CHART_META.find((s) => s.value === status)?.label || 'Tất cả trạng thái';


  const recentRequests = React.useMemo(() => {
    return apiRequests.slice(0, UI_CONSTANTS.DASHBOARD.RECENT_REQUESTS_LIMIT);
  }, [apiRequests]);

  const featuredProducts = (charts?.featuredProducts || []).slice(0, UI_CONSTANTS.DASHBOARD.RECENT_PRODUCTS_LIMIT);

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

  const revenueStats = React.useMemo(() => {
    if (currentRole === 'ADMIN') {
      return {
        closedRevenue: curStats?.closedRevenue ?? 0,
        quotedRevenue: curStats?.quotedRevenue ?? 0,
      };
    }
    return sumRevenue(apiRequests);
  }, [currentRole, curStats, apiRequests]);
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

  const kpiStats = React.useMemo(() => {
    if (currentRole === 'ADMIN') {
      return { total: curStats?.total ?? 0, closeRate: curStats?.closeRate ?? 0 };
    }
    return sumKpi(apiRequests);
  }, [currentRole, curStats, apiRequests]);
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
        <span className={clsx('text-[11px] font-extrabold', dark ? 'text-[#4ade80]' : 'text-[#16a34a]')}>
          Mới so với kỳ trước
        </span>
      );
    }
    const isUp = change >= 0;
    return (
      <span className={clsx('text-[11px] font-extrabold', isUp ? (dark ? 'text-[#4ade80]' : 'text-[#16a34a]') : (dark ? 'text-[#f87171]' : 'text-[#dc2626]'))}>
        {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}% so với kỳ trước
      </span>
    );
  };

  // Badge chênh lệch điểm % (dùng cho tỷ lệ chốt — so sánh tuyệt đối, không phải % tương đối)
  const renderPointChangeBadge = (curr: number, prev: number | undefined) => {
    if (prev === undefined) return null;
    const diff = curr - prev;
    if (Math.abs(diff) < 0.05) return <span className="text-[11px] font-extrabold text-[#94a3b8]">Không đổi so với kỳ trước</span>;
    const isUp = diff > 0;
    return (
      <span className={clsx('text-[11px] font-extrabold', isUp ? 'text-[#16a34a]' : 'text-[#dc2626]')}>
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
    <div className="flex flex-col gap-[22px]">
      {/* 1. View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-black text-[#0f172a] m-0 tracking-[-0.3px] flex items-center gap-[10px]">
            <LayoutDashboard size={22} /> Tổng quan
          </h1>
          <p className="text-[13px] text-muted mt-[4px] mr-0 mb-0 ml-0">
            {timeRange === 'THIS_MONTH' && 'Hoạt động trong tháng này'}
            {timeRange === 'TODAY' && 'Hoạt động trong hôm nay'}
            {timeRange === 'THIS_WEEK' && 'Hoạt động trong tuần này'}
            {timeRange === 'LAST_MONTH' && 'Hoạt động trong tháng trước'}
            {timeRange === 'THIS_YEAR' && 'Hoạt động trong năm nay'}
            {timeRange === 'ALL' && 'Tất cả hoạt động báo giá'}
          </p>
        </div>

        {currentRole !== 'SALE' && (
        <div className="flex items-center gap-[10px]">
          {/* Time Range Filter Select Dropdown */}
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-[12px] text-[#64748b] pointer-events-none" />
            <select
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              className="bg-surface border border-[#cbd5e1] rounded-[8px] pt-[8px] pr-[14px] pb-[8px] pl-[32px] text-[12.5px] font-bold text-[#334155] cursor-pointer outline-none [appearance:auto] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
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
        <div className="grid grid-cols-4 gap-[16px]">
          <div className={cardCls}>
            <div className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.5px]">
              Tổng số yêu cầu
            </div>
            <div className="text-[26px] font-black text-[#0f172a] mt-[6px]">
              {kpiStats.total}
            </div>
            <div className="mt-[6px]">
              {renderChangeBadge(kpiStats.total, prevKpiStats?.total, false)}
            </div>
          </div>
          <div className={cardCls}>
            <div className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.5px]">
              Tỷ lệ chốt trung bình
            </div>
            <div className="text-[26px] font-black text-[#0f172a] mt-[6px]">
              {kpiStats.closeRate.toFixed(1)}%
            </div>
            <div className="mt-[6px]">
              {renderPointChangeBadge(kpiStats.closeRate, prevKpiStats?.closeRate)}
            </div>
          </div>
          <div className={cardCls}>
            <div className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.5px]">
              Doanh thu đã chốt
            </div>
            <div className="text-[26px] font-black text-[#0f172a] mt-[6px]">
              {formatCurrency(revenueStats.closedRevenue)}
            </div>
            <div className="mt-[6px]">
              {renderChangeBadge(revenueStats.closedRevenue, prevRevenueStats?.closedRevenue, false)}
            </div>
          </div>
          <div className={cardCls}>
            <div className="text-[11px] font-extrabold text-[#64748b] uppercase tracking-[0.5px]">
              Giá trị đơn đã báo giá (chưa chốt)
            </div>
            <div className="text-[26px] font-black text-[#0f172a] mt-[6px]">
              {formatCurrency(revenueStats.quotedRevenue)}
            </div>
            <div className="mt-[6px]">
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
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              dominantBaseline="middle"
              // động — recharts
              style={{ fontSize: 26, fontWeight: 900, fill: '#0f172a' }}
            >
              {counts.total}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              dominantBaseline="middle"
              // động — recharts
              style={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8', letterSpacing: 1 }}
            >
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
              <div
                className="mb-[2px]"
                // động — giữ inline
                style={{ color: d.payload.fill }}
              >
                ● {d.name}
              </div>
              <div>{d.value} yêu cầu <span className="text-[#94a3b8]">({pct}%)</span></div>
            </ChartTooltip>
          );
        };

        const TimelineTooltipContent = ({ active, payload, label }: any) => {
          if (!active || !payload?.length) return null;
          const dataItem = payload[0].payload;

          if (chartStatusFilter === 'ALL') {
            return (
              <ChartTooltip padding="10px 14px" minWidth="150px">
                <div className="text-[12px] text-[#94a3b8] border-b border-[#334155] pb-[4px] mb-[6px]">
                  {label}
                </div>
                <div className="font-black mb-[6px] text-[#38bdf8]">
                  Tổng số: {dataItem.total} yêu cầu
                </div>
                <div className="flex flex-col gap-[3px] text-[11.5px]">
                  <div className="text-[#60a5fa]">● Mới tạo: {dataItem.pending}</div>
                  <div className="text-[#fbbf24]">● Đang xử lý: {dataItem.processing}</div>
                  <div className="text-[#fb923c]">● Cần bổ sung: {dataItem.needMoreInfo}</div>
                  <div className="text-[#4ade80]">● Hoàn thành: {dataItem.quoted}</div>
                  <div className="text-[#f87171]">● Từ chối: {dataItem.rejected}</div>
                  <div className="text-[#a78bfa]">● Đã chốt: {dataItem.closed}</div>
                </div>
              </ChartTooltip>
            );
          }

          const selectedVal = dataItem.value;
          return (
            <ChartTooltip>
              <div className="text-[#94a3b8] mb-[2px]">{label}</div>
              <div
                // động — giữ inline
                style={{ color: getStatusColor(chartStatusFilter) }}
              >
                ● {getStatusLabel(chartStatusFilter)}: {selectedVal} yêu cầu
              </div>
            </ChartTooltip>
          );
        };

        return (
          <div className={clsx('grid grid-cols-2 gap-[16px] transition-opacity duration-150', loadingStats ? 'opacity-50 pointer-events-none' : 'opacity-100 pointer-events-auto')}>

            {/* Donut Chart */}
            <div className={cardCls}>
              <h2 className="text-[14px] font-extrabold text-[#0f172a] mt-0 mr-0 mb-[16px] ml-0">
                Phân bố trạng thái yêu cầu
              </h2>
              <div className="flex items-center gap-[20px]">
                <div className="w-[180px] h-[180px] shrink-0">
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
                <div className="flex flex-col gap-[10px] flex-1">
                  {chartData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-[8px]">
                        <div
                          className="w-[10px] h-[10px] rounded-[3px] shrink-0"
                          // động — giữ inline
                          style={{ background: d.fill }}
                        />
                        <span className="text-[12px] text-[#475569] font-semibold">{d.name}</span>
                      </div>
                      <span className="text-[13px] font-black text-[#0f172a]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bar Chart - Timeline Comparison */}
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-[12px]">
                <div>
                  <h2 className="text-[14px] font-extrabold text-[#0f172a] m-0">
                    {timeRange === 'THIS_YEAR' || timeRange === 'ALL' ? 'So sánh số lượng hàng tháng' : 'So sánh số lượng hàng ngày'}
                  </h2>
                  <span className="text-[11px] text-[#64748b]">
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
                  className="bg-[#f8fafc] border border-[#cbd5e1] rounded-[6px] py-[5px] px-[10px] text-[11.5px] font-bold text-[#334155] cursor-pointer outline-none shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
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
                      {/* động — recharts */}
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
        <div className={cardCls}>
          <h2 className="text-[14px] font-extrabold text-[#0f172a] mt-0 mr-0 mb-[4px] ml-0">
            Hiệu suất theo Sale
          </h2>
          <span className="text-[11px] text-[#64748b]">Số yêu cầu đã tạo và đã chốt của từng Sale (top 8)</span>

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
                      <div className="text-[#94a3b8] mb-[2px]">{label}</div>
                      <div className="text-[#38bdf8]">● Đã tạo: {d.total}</div>
                      <div className="text-[#22c55e]">● Đã chốt: {d.closed}</div>
                      <div className="text-[#94a3b8] mt-[2px]">Tỷ lệ chốt: {closeRate}%</div>
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
        <div className="grid grid-cols-3 gap-[16px]">
          <DistributionPieCard title="Phân bố theo danh mục" subtitle="Top 8 danh mục nhiều yêu cầu nhất" data={(charts?.categoryDistribution || []).map((d, idx) => ({ ...d, fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))} />

          <DistributionPieCard title="Phân bố theo chất liệu" subtitle="Top 8 chất liệu nhiều yêu cầu nhất" data={(charts?.materialDistribution || []).map((d, idx) => ({ ...d, fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }))} />

          {/* Phân bố theo khoảng giá */}
          <div className={cardCls}>
            <h2 className="text-[14px] font-extrabold text-[#0f172a] mt-0 mr-0 mb-[4px] ml-0">
              Phân bố theo khoảng giá
            </h2>
            <span className="text-[11px] text-[#64748b]">Số đơn đã báo giá theo từng khoảng</span>

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
                        <div className="text-[#94a3b8]">{label}</div>
                        <div className="text-[#2563eb]">● {payload[0].value} đơn</div>
                      </ChartTooltip>
                    );
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} isAnimationActive={true} animationDuration={600}>
                  {/* động — recharts */}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10.5, fontWeight: 900, fill: '#0f172a' }} formatter={(v: any) => (v > 0 ? v : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Split Content Layout — Admin không cần xem, đã có Doanh thu + Hiệu suất theo Sale ở trên */}
      {currentRole !== 'ADMIN' && (
      <div className="grid [grid-template-columns:2fr_1fr] gap-[18px] items-stretch">
        {/* Left 2/3: Yêu cầu gần đây */}
        <div className={clsx(cardCls, 'h-full flex flex-col')}>
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="text-[16px] font-extrabold text-[#0f172a] m-0">
              Yêu cầu gần đây
            </h2>
            <button
              type="button"
              onClick={onViewAll}
              className="bg-transparent border-0 text-[#64748b] text-[12.5px] font-bold cursor-pointer flex items-center gap-[4px]"
            >
              Xem tất cả <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-left">
                  <th className="py-[8px] px-[10px] text-[10.5px] font-extrabold text-[#94a3b8] uppercase">MÃ YC / KHÁCH HÀNG</th>
                  <th className="py-[8px] px-[10px] text-[10.5px] font-extrabold text-[#94a3b8] uppercase">SẢN PHẨM</th>
                  <th className="py-[8px] px-[10px] text-[10.5px] font-extrabold text-[#94a3b8] uppercase">NGÀY TẠO</th>
                  <th className="py-[8px] px-[10px] text-[10.5px] font-extrabold text-[#94a3b8] uppercase text-right">TRẠNG THÁI</th>
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
                        className="table-row-hover border-b border-[#f8fafc] cursor-pointer"
                      >
                        <td className="py-[12px] px-[10px]">
                          <div className="font-extrabold text-[#0f172a] text-[13px]">
                            {r.code || `#${r.id}`}
                          </div>
                          <div className="text-[11px] text-[#64748b]">
                            {r.customerName || r.requester?.name || 'Khách hàng'}
                          </div>
                        </td>
                        <td className="py-[12px] px-[10px]">
                          <div className="flex items-center gap-[10px]">
                            <img
                              src={imgUrl}
                              alt=""
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                              }}
                              className="w-[36px] h-[36px] rounded-[6px] object-cover border border-[#e2e8f0]"
                            />
                            <span className="font-bold text-[#1e293b] max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                              {r.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-[12px] px-[10px] text-[#64748b] text-[12px]">
                          {formatDateLabel(r.createdAt)}
                        </td>
                        <td className="py-[12px] px-[10px] text-right">
                          {getStatusPill(r.status)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-[#94a3b8] p-[24px]">
                      Chưa có yêu cầu nào gần đây
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1/3: Sản phẩm nổi bật */}
        <div className={clsx(cardCls, 'h-full flex flex-col')}>
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="text-[16px] font-extrabold text-[#0f172a] m-0">
              Sản phẩm nổi bật
            </h2>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="bg-transparent border-0 text-[#64748b] text-[12px] font-bold cursor-pointer flex items-center gap-[4px]"
            >
              Thư viện <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-[12px]">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((item) => {
                const rawImg = item.images && item.images.length > 0 ? item.images[0].imageUrl : null;
                const imgUrl = rawImg || UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                const formattedPrice = item.price > 0 ? formatCurrency(item.price) : '---';

                return (
                  <div
                    key={item.key}
                    // Không cho bấm vào sản phẩm nổi bật
                    className="bg-surface border border-[#e2e8f0] rounded-[10px] overflow-hidden cursor-default transition-transform duration-150"
                  >
                    <div className="relative w-full aspect-square bg-[#f8fafc]">
                      <img
                        src={imgUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE;
                        }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="py-[8px] px-[10px]">
                      <div className="text-[12px] font-extrabold text-[#0f172a] overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.productName}
                      </div>
                      <div className="text-[11px] font-black text-primary mt-[2px]">
                        {formattedPrice}
                      </div>
                      {item.materialPrice != null && renderPriceBreakdownLines({ material: item.materialPrice, stone: item.stonePrice ?? 0 })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="[grid-column:1/-1] text-[#94a3b8] text-[12.5px] text-center py-[24px] px-0">
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
