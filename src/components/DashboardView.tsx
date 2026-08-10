import React from 'react';
import type { QuoteRequest, Role } from '../types';
import {
  ArrowRight,
  FilePlus,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Plus,
  FileText,
  Hourglass,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { UI_CONSTANTS } from '../constants';
import { fetchQuoteRequests } from '../services/api';

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
  onOpenCreateModal,
  onFilterChange,
}) => {
  const [timeRange, setTimeRange] = React.useState<string>('THIS_MONTH');
  const [counts, setCounts] = React.useState(initialCounts);
  const [apiRequests, setApiRequests] = React.useState<QuoteRequest[]>(initialRequests);
  const [loadingStats, setLoadingStats] = React.useState<boolean>(false);

  // Sync initial props if they update from parent
  React.useEffect(() => {
    if (timeRange === 'THIS_MONTH' && !loadingStats) {
      setCounts(initialCounts);
      setApiRequests(initialRequests);
    }
  }, [initialCounts, initialRequests]);

  // Fetch real counts & request items from backend API when timeRange changes
  const handleTimeRangeChange = async (newRange: string) => {
    setTimeRange(newRange);
    setLoadingStats(true);
    try {
      const res = await fetchQuoteRequests({
        timeRange: newRange,
        includeCounts: true,
        limit: 100,
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

  const overdueCount = React.useMemo(() => {
    return apiRequests.filter((r) => r.status === 'YC_MOI' || r.status === 'DANG_XLY').length;
  }, [apiRequests]);

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

          {(currentRole === 'SALE' || currentRole === 'ADMIN') && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              style={{
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
              }}
            >
              <Plus size={16} /> Tạo báo giá
            </button>
          )}
        </div>
      </div>

      {/* 2. 5 Metric KPI Summary Cards (Pure Numbers from REAL DATA, NO BADGES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
        {/* TỔNG YÊU CẦU */}
        <div
          onClick={() => onFilterChange ? onFilterChange('ALL') : onViewAll()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <FileText size={17} />
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            TỔNG YÊU CẦU
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {counts.total.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* MỚI TẠO */}
        <div
          onClick={() => onFilterChange ? onFilterChange('YC_MOI') : onViewAll()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FilePlus size={17} />
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            MỚI TẠO
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {counts.ycMoi.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* ĐANG XỬ LÝ */}
        <div
          onClick={() => onFilterChange ? onFilterChange('DANG_XLY') : onViewAll()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Hourglass size={17} />
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            ĐANG XỬ LÝ
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {counts.dangXly.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* QUÁ HẠN */}
        <div
          onClick={() => onViewAll()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
              <AlertTriangle size={17} />
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            QUÁ HẠN
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {overdueCount.toLocaleString('vi-VN')}
          </div>
        </div>

        {/* HOÀN THÀNH */}
        <div
          onClick={() => onFilterChange ? onFilterChange('XONG') : onViewAll()}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          className="metric-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle size={17} />
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            HOÀN THÀNH
          </div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            {counts.xong.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      {/* 3. Split Content Layout */}
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
                const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('vi-VN') + ' đ' : '---';

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
