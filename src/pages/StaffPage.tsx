import React, { useEffect, useRef, useState } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, Check, X, ShieldCheck, Lock, Unlock, Activity, Calendar, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { getAllUsersApi, approveUserApi, rejectUserApi, setUserActiveApi, getAuditStatsApi, getUserStatsApi, getStaffPerformanceApi } from '../services/api';
import type { StaffUser, UserStatsResponse, StaffPerformanceResponse, Role } from '../types';
import { Pagination } from '../components/Pagination';
import { formatDuration } from '../utils/currency';
import { ACTION_LABEL, ROLE_LABEL} from '../constants/staffLabels';
import { StatCard } from '../components/StatCard';
import { UserAvatar } from '../components/UserAvatar';
import {
  dateInputPy6Cls,
  cardContainerCls,
  cardHeadingCls,
  staffThCls,
  emptyTextCls,
} from '../styles/classNames';

type ActionStat = { action: string; count: number; byActor: { actorId: string | null; actorName: string; count: number }[] };

// Nút lọc nhanh — cùng bộ preset với Dashboard. BE (resolveDateRange) quy đổi ra mốc gte/lte.
const TIME_PRESETS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'THIS_WEEK', label: 'Tuần này' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'LAST_MONTH', label: 'Tháng trước' },
  { value: 'THIS_YEAR', label: 'Năm nay' },
];

// BE đếm riêng theo từng action code (VD CALCULATE_PRICE / CALCULATE_MULTI_MATERIAL_PRICE) —
// gộp lại theo nhãn hiển thị (ACTION_LABEL) để 2 action cùng tên tiếng Việt không tách 2 dòng.
const mergeActionsByLabel = (actions: ActionStat[]): ActionStat[] => {
  const merged = new Map<string, ActionStat>();
  for (const a of actions) {
    const label = ACTION_LABEL[a.action] || a.action;
    const existing = merged.get(label);
    if (!existing) {
      merged.set(label, { ...a, byActor: a.byActor.map((x) => ({ ...x })) });
      continue;
    }
    existing.count += a.count;
    for (const actor of a.byActor) {
      const target = existing.byActor.find((x) => x.actorId === actor.actorId);
      if (target) target.count += actor.count;
      else existing.byActor.push({ ...actor });
    }
  }
  return [...merged.values()].sort((x, y) => y.count - x.count);
};

export const StaffPage: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [userStats, setUserStats] = useState<UserStatsResponse | null>(null);
  const [performance, setPerformance] = useState<StaffPerformanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState<'PENDING' | 'ACTIVE'>('PENDING');
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);
  const [actionStats, setActionStats] = useState<Record<string, { action: string; count: number; byActor: { actorId: string | null; actorName: string; count: number }[] }[]>>({});
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  // Role admin chọn khi duyệt từng tài khoản chờ (mặc định giữ role hiện tại — Lark tạo ra là SALE)
  const [approveRole, setApproveRole] = useState<Record<string, Role>>({});

  // Bộ lọc thời gian — mặc định 'ALL' để không ẩn tài khoản chờ duyệt cũ. Khoảng ngày tùy chọn
  // (startDate/endDate) khi có sẽ được BE ưu tiên hơn preset. Mọi số liệu tính ở BE.
  const [timeRange, setTimeRange] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const isFiltered = timeRange !== 'ALL' || Boolean(startDate) || Boolean(endDate);
  // Đếm request để bỏ qua response trả về trễ (race condition khi đổi mốc thời gian liên tục)
  const requestIdRef = useRef(0);

  useEffect(() => {
    setAccountPage(1);
  }, [accountTab]);

  useEffect(() => {
    const filter = { timeRange, startDate, endDate };
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    Promise.all([
      getAllUsersApi(filter),
      getUserStatsApi(filter),
      getStaffPerformanceApi(filter),
      getAuditStatsApi(filter).catch(() => ({})),
    ])
      .then(([userList, stats, perf, auditStats]) => {
        if (myRequestId !== requestIdRef.current) return;
        setUsers(userList || []);
        setUserStats(stats);
        setPerformance(perf);
        setActionStats(auditStats || {});
        setError(null);
      })
      .catch((err) => {
        if (myRequestId === requestIdRef.current) {
          setError(err.message || 'Không thể tải dữ liệu nhân viên');
        }
      })
      .finally(() => {
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
        }
      });
  }, [timeRange, startDate, endDate]);

  const applyPreset = (value: string) => {
    setTimeRange(value);
    setStartDate('');
    setEndDate('');
  };
  const resetTimeFilter = () => {
    setTimeRange('ALL');
    setStartDate('');
    setEndDate('');
  };

  const pendingUsers = users.filter((u) => !u.isApproved && u.role !== 'ADMIN');
  const activeListUsers = users.filter((u) => u.isApproved && u.role !== 'ADMIN').sort((a, b) => a.name.localeCompare(b.name));
  // Tài khoản đã khóa (isActive=false) không còn thao tác — ẩn khỏi các bảng thống kê/hoạt động bên dưới
  const lockedUserIds = new Set(users.filter((u) => !u.isActive).map((u) => u.id));

  const currentAccountList = accountTab === 'PENDING' ? pendingUsers : activeListUsers;
  const accountTotalPages = Math.max(1, Math.ceil(currentAccountList.length / accountPageSize));
  const pagedAccountList = currentAccountList.slice((accountPage - 1) * accountPageSize, accountPage * accountPageSize);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    const role = approveRole[id];
    try {
      const updated = await approveUserApi(id, role);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isApproved: true, role: updated.role } : u)));
    } catch (err: any) {
      alert(err.message || 'Không thể phê duyệt tài khoản');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Từ chối và xóa tài khoản này?')) return;
    setActionLoadingId(id);
    try {
      await rejectUserApi(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Không thể từ chối tài khoản');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const action = current ? 'khóa' : 'mở khóa';
    if (!confirm(`Xác nhận ${action} tài khoản này?`)) return;
    setActionLoadingId(id);
    try {
      await setUserActiveApi(id, !current);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !current } : u)));
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật trạng thái tài khoản');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalUsers = userStats?.totalUsers || 0;
  const byRole = userStats?.byRole || { SALE: 0, ORDER: 0, ADMIN: 0 };
  const pendingCount = userStats?.pendingCount || 0;
  const deptStats = (userStats?.byDept || []).map((d) => [d.name, d.count] as [string, number]);
  const saleStats = performance?.saleStats || [];
  const pricerStats = performance?.pricerStats || [];

  if (error) {
    return <div className="p-[40px] text-center text-[#dc2626]"> {error}</div>;
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <h1 className="text-[24px] font-black text-[#0f172a] m-0 tracking-[-0.3px] flex items-center gap-[10px]">
          <Users size={22} /> Quản Lý Nhân Viên
        </h1>
        <p className="text-[13px] text-muted m-0 mt-[4px]">
          Thống kê người dùng và hiệu suất người báo giá
        </p>
      </div>

      {/* Bộ lọc thời gian — áp cho toàn trang. BE lọc theo user.createdAt / quoteRequest.createdAt /
          auditLog.createdAt và tính hết số liệu; FE chỉ hiển thị kết quả. */}
      <div className="bg-surface border border-border rounded-[12px] py-[10px] px-[14px] flex items-center gap-[12px] flex-wrap">
        <span className="text-[11px] font-extrabold text-muted uppercase tracking-[0.4px] inline-flex items-center gap-[6px]">
          <Calendar size={13} /> Khoảng thời gian
        </span>

        <div className="flex gap-[6px] flex-wrap">
          {TIME_PRESETS.map((p) => {
            const active = !startDate && !endDate && timeRange === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => applyPreset(p.value)}
                className={clsx(
                  'py-[6px] px-[12px] rounded-[6px] text-[11.5px] font-bold cursor-pointer border',
                  active ? 'bg-[#0f172a] text-surface border-[#0f172a]' : 'bg-[#f1f5f9] text-muted border-transparent',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-[6px]">
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => { setStartDate(e.target.value); if (e.target.value) setTimeRange('ALL'); }}
            className={dateInputPy6Cls}
          />
          <span className="text-faint text-[12px]">—</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => { setEndDate(e.target.value); if (e.target.value) setTimeRange('ALL'); }}
            className={dateInputPy6Cls}
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={resetTimeFilter}
            className="inline-flex items-center gap-[4px] py-[6px] px-[12px] rounded-[6px] bg-surface border border-border text-[#475569] text-[11.5px] font-bold cursor-pointer"
          >
            <RotateCcw size={12} /> Xóa lọc
          </button>
        )}

        {loading && <span className="text-[11.5px] text-faint font-semibold">Đang tải…</span>}
      </div>

      {/* 2.1 Thống kê người dùng */}
      <div className="grid grid-cols-4 gap-[16px]">
        <StatCard icon={<Users size={14} />} label="Tổng người dùng" value={totalUsers} />
        <div className="bg-surface border border-border rounded-[14px] py-[18px] px-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="text-[11px] font-extrabold text-muted uppercase">Sale / Order</div>
          <div className="text-[18px] font-black text-[#0f172a] mt-[8px]">
            {byRole.SALE} <span className="text-[#cbd5e1] font-bold">/</span> {byRole.ORDER}
          </div>
        </div>
        <StatCard icon={<UserCheck size={14} />} label="Đã duyệt" value={totalUsers - pendingCount} tone="success" />
        <StatCard
          icon={<UserX size={14} />}
          label="Chờ duyệt"
          value={pendingCount}
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Quản lý tài khoản — 2 tab: chờ duyệt / đang hoạt động */}
      <div className={cardContainerCls}>
        <h2 className={cardHeadingCls}>
          <ShieldCheck size={16} color="#2563eb" /> Quản lý tài khoản
        </h2>
        <span className="text-[11px] text-muted">Duyệt tài khoản mới hoặc khóa/mở khóa tài khoản đang hoạt động</span>

        <div className="flex gap-[8px] mt-[14px] border-b border-[#f1f5f9] pb-[12px]">
          <button
            type="button"
            onClick={() => setAccountTab('PENDING')}
            className={clsx(
              'inline-flex items-center gap-[6px] py-[7px] px-[14px] rounded-[8px] text-[12.5px] font-bold cursor-pointer border',
              accountTab === 'PENDING' ? 'bg-surface text-[#0f172a] border-[#0f172a]' : 'bg-[#f1f5f9] text-[#475569] border-transparent',
            )}
          >
            Tài khoản chờ duyệt {pendingUsers.length > 0 && `(${pendingUsers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setAccountTab('ACTIVE')}
            className={clsx(
              'inline-flex items-center gap-[6px] py-[7px] px-[14px] rounded-[8px] text-[12.5px] font-bold cursor-pointer border',
              accountTab === 'ACTIVE' ? 'bg-surface text-[#0f172a] border-[#0f172a]' : 'bg-[#f1f5f9] text-[#475569] border-transparent',
            )}
          >
            Tài khoản đang hoạt động ({activeListUsers.length})
          </button>
        </div>

        {accountTab === 'PENDING' && (pendingUsers.length > 0 ? (
          <div className="overflow-x-auto mt-[14px]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-left">
                  <th className={staffThCls}>Tên</th>
                  <th className={staffThCls}>Email</th>
                  <th className={staffThCls}>Vai trò</th>
                  <th className={clsx(staffThCls, 'text-right')}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccountList.map((u) => (
                  <tr key={u.id} className="border-b border-[#f8fafc]">
                    <td className="p-[10px] font-bold text-[#0f172a]">
                      <span className="inline-flex items-center gap-[8px]">
                        <UserAvatar src={u.avatar} name={u.name} size={26} background="#475569" />
                        {u.name}
                      </span>
                    </td>
                    <td className="p-[10px] text-muted">{u.email}</td>
                    <td className="p-[10px] text-[#334155]">
                      <select
                        value={approveRole[u.id] || u.role}
                        disabled={actionLoadingId === u.id}
                        onChange={(e) => setApproveRole((prev) => ({ ...prev, [u.id]: e.target.value as Role }))}
                        className="py-[5px] px-[8px] rounded-[6px] border border-border bg-surface text-[#334155] text-[11.5px] font-semibold cursor-pointer"
                      >
                        {(['SALE', 'ORDER'] as Role[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-[10px] text-right">
                      <div className="inline-flex gap-[6px]">
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleApprove(u.id)}
                          className={clsx(
                            'inline-flex items-center gap-[4px] py-[5px] px-[10px] rounded-[6px] border-0 bg-[#16a34a] text-surface text-[11.5px] font-bold',
                            actionLoadingId === u.id ? 'cursor-default opacity-60' : 'cursor-pointer',
                          )}
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleReject(u.id)}
                          className={clsx(
                            'inline-flex items-center gap-[4px] py-[5px] px-[10px] rounded-[6px] border border-[#fecdd3] bg-[#fff1f2] text-[#be123c] text-[11.5px] font-bold',
                            actionLoadingId === u.id ? 'cursor-default opacity-60' : 'cursor-pointer',
                          )}
                        >
                          <X size={12} /> Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={emptyTextCls}>Không có tài khoản nào chờ duyệt</div>
        ))}

        {accountTab === 'ACTIVE' && (activeListUsers.length > 0 ? (
          <div className="overflow-x-auto mt-[14px]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-left">
                  <th className={staffThCls}>Tên</th>
                  <th className={staffThCls}>Email</th>
                  <th className={staffThCls}>Vai trò</th>
                  <th className={staffThCls}>Trạng thái</th>
                  <th className={clsx(staffThCls, 'text-right')}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccountList.map((u) => (
                  <tr key={u.id} className="border-b border-[#f8fafc]">
                    <td className="p-[10px] font-bold text-[#0f172a]">
                      <span className="inline-flex items-center gap-[8px]">
                        <UserAvatar src={u.avatar} name={u.name} size={26} background="#475569" />
                        {u.name}
                      </span>
                    </td>
                    <td className="p-[10px] text-muted">{u.email}</td>
                    <td className="p-[10px] text-[#334155]">{ROLE_LABEL[u.role] || u.role}</td>
                    <td className="p-[10px]">
                      <span className={clsx(
                        'inline-flex items-center gap-[4px] py-[3px] px-[8px] rounded-[20px] text-[11px] font-bold border',
                        u.isActive ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]' : 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3]',
                      )}>
                        {u.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="p-[10px] text-right">
                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        className={clsx(
                          'inline-flex items-center gap-[4px] py-[5px] px-[10px] rounded-[6px] text-surface text-[11.5px] font-bold',
                          u.isActive ? 'border border-[#fecdd3] bg-[#fff1f2] text-[#be123c]' : 'border-0 bg-[#16a34a] text-surface',
                          actionLoadingId === u.id ? 'cursor-default opacity-60' : 'cursor-pointer',
                        )}
                      >
                        {u.isActive ? <><Lock size={12} /> Khóa</> : <><Unlock size={12} /> Mở khóa</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-faint text-[12.5px] py-[20px] px-0">Chưa có tài khoản nào được duyệt</div>
        ))}

        {currentAccountList.length > 0 && (
          <div className="mt-[14px]">
            <Pagination
              currentPage={accountPage}
              totalPages={accountTotalPages}
              totalItems={currentAccountList.length}
              pageSize={accountPageSize}
              onPageChange={setAccountPage}
              onPageSizeChange={(size) => { setAccountPageSize(size); setAccountPage(1); }}
            />
          </div>
        )}
      </div>

      {/* Phân bố theo bộ phận */}
      <div className={cardContainerCls}>
        <h2 className="text-[14px] font-extrabold text-[#0f172a] m-0 mb-[14px]">Phân bố theo bộ phận</h2>
        {deptStats.length > 0 ? (
          <div className="flex flex-col gap-[10px]">
            {deptStats.map(([name, count]) => (
              <div key={name} className="flex items-center gap-[12px]">
                <span className="text-[12.5px] text-[#334155] font-semibold w-[160px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>
                <div className="flex-1 bg-[#f1f5f9] rounded-[6px] h-[10px] overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-[6px]"
                    // động — giữ inline
                    style={{ width: `${(count / (totalUsers || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-[12.5px] font-black text-[#0f172a] w-[24px] text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-faint text-[12.5px] py-[20px] px-0">Chưa có dữ liệu</div>
        )}
      </div>

      {/* 2.2 Hiệu suất Sale & Order */}
      <div className="grid grid-cols-2 gap-[16px]">
        <div className={cardContainerCls}>
          <h2 className={cardHeadingCls}>
            <TrendingUp size={16} color="#2563eb" /> Hiệu suất Sale
          </h2>
          <span className="text-[11px] text-muted">Số yêu cầu đã tạo & đã chốt của từng Sale</span>

          {saleStats.length > 0 ? (
            <div className="overflow-x-auto mt-[14px]">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#f1f5f9] text-left">
                    <th className={staffThCls}>Sale</th>
                    <th className={clsx(staffThCls, 'text-right')}>Đã tạo</th>
                    <th className={clsx(staffThCls, 'text-right')}>Đã chốt</th>
                    <th className={clsx(staffThCls, 'text-right')}>Tỷ lệ chốt</th>
                  </tr>
                </thead>
                <tbody>
                  {saleStats.map((s) => (
                    <tr key={s.id} className="border-b border-[#f8fafc]">
                      <td className="p-[10px] font-bold text-[#0f172a]">{s.name}</td>
                      <td className="p-[10px] text-right text-[#334155]">{s.total}</td>
                      <td className="p-[10px] text-right text-[#334155]">{s.closed}</td>
                      <td className="p-[10px] text-right text-[#16a34a] font-bold">{s.closeRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={emptyTextCls}>Chưa có Sale nào trong hệ thống</div>
          )}
        </div>

        <div className={cardContainerCls}>
          <h2 className={cardHeadingCls}>
            <TrendingUp size={16} color="#2563eb" /> Hiệu suất người báo giá
          </h2>
          <span className="text-[11px] text-muted">Thời gian trung bình báo giá & xử lý của từng Order</span>

          {pricerStats.length > 0 ? (
            <div className="overflow-x-auto mt-[14px]">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="border-b border-[#f1f5f9] text-left">
                    <th className={staffThCls}>Order</th>
                    <th className={clsx(staffThCls, 'text-right')}>Đã xử lý</th>
                    <th className={clsx(staffThCls, 'text-right')}>TB báo giá</th>
                    <th className={clsx(staffThCls, 'text-right')}>TB xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {pricerStats.map((p) => (
                    <tr key={p.id} className="border-b border-[#f8fafc]">
                      <td className="p-[10px] font-bold text-[#0f172a]">{p.name}</td>
                      <td className="p-[10px] text-right text-[#334155]">{p.totalHandled}</td>
                      <td className="p-[10px] text-right text-[#0f766e] font-bold">
                        {p.avgQuoteMs !== null ? formatDuration(0, p.avgQuoteMs) : '---'}
                      </td>
                      <td className="p-[10px] text-right text-[#334155] font-bold">
                        <span className="inline-flex items-center gap-[4px]">
                          <Clock size={12} color="#94a3b8" />
                          {p.avgProcessMs !== null ? formatDuration(0, p.avgProcessMs) : '---'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={emptyTextCls}>Chưa có Order nào trong hệ thống</div>
          )}
        </div>
      </div>

      {/* 2.3 + 2.4 gộp — Top hành động theo role (Audit Log) */}
      <div className={cardContainerCls}>
        <h2 className={cardHeadingCls}>
          <Activity size={16} color="#2563eb" /> Top hành động theo role
        </h2>
      
        {Object.keys(actionStats).length > 0 ? (
          <div
            className="grid gap-[20px] mt-[14px]"
            // động — giữ inline
            style={{ gridTemplateColumns: `repeat(${Object.keys(actionStats).length}, 1fr)` }}
          >
            {Object.entries(actionStats).map(([role, rawActions]) => {
              const actions = mergeActionsByLabel(rawActions);
              const maxCount = actions[0]?.count || 1;
              return (
                <div key={role}>
                  <div className="text-[11px] font-extrabold text-muted uppercase mb-[10px]">
                    {ROLE_LABEL[role] || role}
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    {actions.slice(0, 6).map((a) => {
                      const key = `${role}:${a.action}`;
                      const isOpen = expandedAction === key;
                      return (
                        <div key={a.action}>
                          <div
                            onClick={() => setExpandedAction(isOpen ? null : key)}
                            className="flex justify-between text-[11.5px] text-[#334155] mb-[3px] cursor-pointer"
                          >
                            <span className="font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{ACTION_LABEL[a.action] || a.action}</span>
                            <span className="font-black text-[#0f172a] shrink-0 ml-[8px]">{a.count}</span>
                          </div>
                          <div
                            onClick={() => setExpandedAction(isOpen ? null : key)}
                            className="bg-[#f1f5f9] rounded-[6px] h-[6px] overflow-hidden cursor-pointer"
                          >
                            <div
                              className={clsx('h-full rounded-[6px]', isOpen ? 'bg-[#0f172a]' : 'bg-primary')}
                              // động — giữ inline
                              style={{ width: `${(a.count / maxCount) * 100}%` }}
                            />
                          </div>
                          {isOpen && (
                            <div className="mt-[6px] py-[8px] px-[10px] bg-[#f8fafc] border border-[#f1f5f9] rounded-[8px] flex flex-col gap-[4px]">
                              {a.byActor.filter((actor) => !actor.actorId || !lockedUserIds.has(actor.actorId)).map((actor) => (
                                <div key={actor.actorId || actor.actorName} className="flex justify-between text-[11px]">
                                  <span className="text-[#334155] font-semibold">{actor.actorName}</span>
                                  <span className="text-muted font-bold">{actor.count} lần</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={emptyTextCls}>Chưa có dữ liệu hành động nào được ghi nhận</div>
        )}
      </div>
    </div>
  );
};
