import React, { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Clock, TrendingUp, Check, X, ShieldCheck, Lock, Unlock, Activity } from 'lucide-react';
import { getAllUsersApi, approveUserApi, rejectUserApi, setUserActiveApi, getAuditStatsApi } from '../services/api';
import { fetchQuoteRequests } from '../services/api';
import type { QuoteRequest, Role } from '../types';
import { Pagination } from './Pagination';

const ACTION_LABEL: Record<string, string> = {
  ACCEPT_QUOTE: 'Tiếp nhận yêu cầu',
  QUOTE_PRICE: 'Báo giá',
  QUICK_QUOTE: 'Báo giá nhanh (nháp)',
  QUICK_APPROVE: 'Duyệt báo giá nhanh',
  QUICK_REJECT: 'Từ chối báo giá nhanh',
  REJECT_QUOTE: 'Từ chối yêu cầu',
  RETURN_QUOTE: 'Trả lại yêu cầu',
  RESUBMIT_QUOTE: 'Gửi lại yêu cầu',
  MARK_CLOSED: 'Đánh dấu đã chốt',
  SELECT_OPTION: 'Chọn phương án báo giá',
  CREATE_QUOTE: 'Tạo yêu cầu',
  UPDATE_QUOTE: 'Sửa yêu cầu',
  DELETE_QUOTE: 'Xóa yêu cầu',
  QUICK_SUBMIT_QUOTE: 'Gửi báo giá nhanh',
  APPROVE_USER: 'Duyệt tài khoản',
  REJECT_USER: 'Từ chối tài khoản',
  LOCK_USER: 'Khóa tài khoản',
  UNLOCK_USER: 'Mở khóa tài khoản',
  CREATE_CUSTOMER: 'Tạo khách hàng',
  UPDATE_CUSTOMER: 'Sửa khách hàng',
  DELETE_CUSTOMER: 'Xóa khách hàng',
  CALCULATE_PRICE: 'Tính giá',
  GENERATE_PRICING_OPTIONS: 'Tạo phương án giá',
};

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isApproved: boolean;
  isActive: boolean;
  department?: { id: string; name: string } | null;
  createdAt: string;
}

// Dưới 1 phút hiện giây, dưới 1 giờ hiện phút, dưới 1 ngày hiện giờ, từ 1 ngày trở lên hiện ngày tròn
const formatDuration = (ms: number): string => {
  const seconds = ms / 1000;
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} giây`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} phút`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.max(1, Math.round(hours))} giờ`;
  return `${Math.round(hours / 24)} ngày`;
};

const ROLE_LABEL: Record<string, string> = { SALE: 'Sale', ORDER: 'Order', ADMIN: 'Admin' };

export const StaffManagementView: React.FC = () => {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState<'PENDING' | 'ACTIVE'>('PENDING');
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(10);
  const [actionStats, setActionStats] = useState<Record<string, { action: string; count: number; byActor: { actorId: string | null; actorName: string; count: number }[] }[]>>({});
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  useEffect(() => {
    setAccountPage(1);
  }, [accountTab]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAllUsersApi(),
      fetchQuoteRequests({ timeRange: 'ALL', limit: 1000 }),
      getAuditStatsApi().catch(() => ({})),
    ])
      .then(([userList, quoteRes, stats]) => {
        setUsers(userList || []);
        setQuoteRequests(quoteRes?.data || []);
        setActionStats(stats || {});
        setError(null);
      })
      .catch((err) => setError(err.message || 'Không thể tải dữ liệu nhân viên'))
      .finally(() => setLoading(false));
  }, []);

  // 2.1 Thống kê người dùng
  const totalUsers = users.length;
  const byRole = { SALE: 0, ORDER: 0, ADMIN: 0 };
  const byDept = new Map<string, number>();
  let pendingCount = 0;
  users.forEach((u) => {
    if (u.role in byRole) byRole[u.role as keyof typeof byRole] += 1;
    const deptName = u.department?.name || 'Chưa gán bộ phận';
    byDept.set(deptName, (byDept.get(deptName) || 0) + 1);
    if (!u.isApproved) pendingCount += 1;
  });
  const deptStats = Array.from(byDept.entries()).sort((a, b) => b[1] - a[1]);
  const pendingUsers = users.filter((u) => !u.isApproved && u.role !== 'ADMIN');
  const activeListUsers = users.filter((u) => u.isApproved && u.role !== 'ADMIN').sort((a, b) => a.name.localeCompare(b.name));

  const currentAccountList = accountTab === 'PENDING' ? pendingUsers : activeListUsers;
  const accountTotalPages = Math.max(1, Math.ceil(currentAccountList.length / accountPageSize));
  const pagedAccountList = currentAccountList.slice((accountPage - 1) * accountPageSize, accountPage * accountPageSize);

  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      await approveUserApi(id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isApproved: true } : u)));
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

  // Hiệu suất Sale — số yêu cầu đã tạo & đã chốt của từng Sale
  const sales = users.filter((u) => u.role === 'SALE');
  const saleStats = sales.map((sale) => {
    const created = quoteRequests.filter((r) => r.requester?.id === sale.id);
    const total = created.length;
    const closed = created.filter((r) => r.status === 'DA_CHOT').length;
    return { id: sale.id, name: sale.name, total, closed, closeRate: total > 0 ? (closed / total) * 100 : 0 };
  }).sort((a, b) => b.total - a.total);

  // 2.2 Quản lý người báo giá — thời gian TB báo giá & TB xử lý của từng pricer
  const pricers = users.filter((u) => u.role === 'ORDER');
  const pricerStats = pricers.map((pricer) => {
    const handled = quoteRequests.filter((r) => r.pricer?.id === pricer.id && r.acceptedAt);
    const quoteDurations: number[] = [];
    const processDurations: number[] = [];

    handled.forEach((r) => {
      const acceptedMs = new Date(r.acceptedAt!).getTime();
      if (r.quotedDate) {
        const dur = new Date(r.quotedDate).getTime() - acceptedMs;
        if (dur >= 0) {
          quoteDurations.push(dur);
          processDurations.push(dur);
        }
      } else if (r.returnedAt) {
        const dur = new Date(r.returnedAt).getTime() - acceptedMs;
        if (dur >= 0) processDurations.push(dur);
      } else if (r.status === 'TU_CHOI' && r.updatedAt) {
        const dur = new Date(r.updatedAt).getTime() - acceptedMs;
        if (dur >= 0) processDurations.push(dur);
      }
    });

    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

    return {
      id: pricer.id,
      name: pricer.name,
      totalHandled: handled.length,
      avgQuoteMs: avg(quoteDurations),
      avgProcessMs: avg(processDurations),
    };
  }).sort((a, b) => b.totalHandled - a.totalHandled);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu nhân viên...</div>;
  }
  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}> {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Quản Lý Nhân Viên
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
          Thống kê người dùng và hiệu suất người báo giá
        </p>
      </div>

      {/* 2.1 Thống kê người dùng */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            <Users size={14} /> Tổng người dùng
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>{totalUsers}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sale / Order</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '8px' }}>
            {byRole.SALE} <span style={{ color: '#cbd5e1', fontWeight: 700 }}>/</span> {byRole.ORDER}
          </div>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
            <UserCheck size={14} /> Đã duyệt
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '6px' }}>{totalUsers - pendingCount}</div>
        </div>
        <div style={{ background: pendingCount > 0 ? '#fff7ed' : '#ffffff', border: `1px solid ${pendingCount > 0 ? '#fed7aa' : '#e2e8f0'}`, borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: pendingCount > 0 ? '#c2410c' : '#64748b', textTransform: 'uppercase' }}>
            <UserX size={14} /> Chờ duyệt
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: pendingCount > 0 ? '#c2410c' : '#0f172a', marginTop: '6px' }}>{pendingCount}</div>
        </div>
      </div>

      {/* Quản lý tài khoản — 2 tab: chờ duyệt / đang hoạt động */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={16} color="#2563eb" /> Quản lý tài khoản
        </h2>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Duyệt tài khoản mới hoặc khóa/mở khóa tài khoản đang hoạt động</span>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setAccountTab('PENDING')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: accountTab === 'PENDING' ? '#0f172a' : '#f1f5f9',
              color: accountTab === 'PENDING' ? '#fff' : '#475569',
              fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Tài khoản chờ duyệt {pendingUsers.length > 0 && `(${pendingUsers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setAccountTab('ACTIVE')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none',
              background: accountTab === 'ACTIVE' ? '#0f172a' : '#f1f5f9',
              color: accountTab === 'ACTIVE' ? '#fff' : '#475569',
              fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Tài khoản đang hoạt động ({activeListUsers.length})
          </button>
        </div>

        {accountTab === 'PENDING' && (pendingUsers.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tên</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Vai trò</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccountList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{u.email}</td>
                    <td style={{ padding: '10px', color: '#334155' }}>{ROLE_LABEL[u.role] || u.role}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleApprove(u.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: actionLoadingId === u.id ? 'default' : 'pointer', opacity: actionLoadingId === u.id ? 0.6 : 1 }}
                        >
                          <Check size={12} /> Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === u.id}
                          onClick={() => handleReject(u.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#be123c', fontSize: '11.5px', fontWeight: 700, cursor: actionLoadingId === u.id ? 'default' : 'pointer', opacity: actionLoadingId === u.id ? 0.6 : 1 }}
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
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>Không có tài khoản nào chờ duyệt</div>
        ))}

        {accountTab === 'ACTIVE' && (activeListUsers.length > 0 ? (
          <div style={{ overflowX: 'auto', marginTop: '14px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tên</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Vai trò</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Trạng thái</th>
                  <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccountList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>{u.name}</td>
                    <td style={{ padding: '10px', color: '#64748b' }}>{u.email}</td>
                    <td style={{ padding: '10px', color: '#334155' }}>{ROLE_LABEL[u.role] || u.role}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                        background: u.isActive ? '#f0fdf4' : '#fff1f2',
                        color: u.isActive ? '#15803d' : '#be123c',
                        border: `1px solid ${u.isActive ? '#bbf7d0' : '#fecdd3'}`,
                      }}>
                        {u.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        disabled={actionLoadingId === u.id}
                        onClick={() => handleToggleActive(u.id, u.isActive)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px',
                          border: u.isActive ? '1px solid #fecdd3' : 'none',
                          background: u.isActive ? '#fff1f2' : '#16a34a',
                          color: u.isActive ? '#be123c' : '#fff',
                          fontSize: '11.5px', fontWeight: 700,
                          cursor: actionLoadingId === u.id ? 'default' : 'pointer',
                          opacity: actionLoadingId === u.id ? 0.6 : 1,
                        }}
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
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '20px 0' }}>Chưa có tài khoản nào được duyệt</div>
        ))}

        {currentAccountList.length > 0 && (
          <div style={{ marginTop: '14px' }}>
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
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>Phân bố theo bộ phận</h2>
        {deptStats.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {deptStats.map(([name, count]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600, width: '160px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${(count / totalUsers) * 100}%`, background: '#2563eb', height: '100%', borderRadius: '6px' }} />
                </div>
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#0f172a', width: '24px', textAlign: 'right', flexShrink: 0 }}>{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '20px 0' }}>Chưa có dữ liệu</div>
        )}
      </div>

      {/* 2.2 Hiệu suất Sale & Order */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#2563eb" /> Hiệu suất Sale
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Số yêu cầu đã tạo & đã chốt của từng Sale</span>

          {saleStats.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Sale</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Đã tạo</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Đã chốt</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Tỷ lệ chốt</th>
                  </tr>
                </thead>
                <tbody>
                  {saleStats.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>{s.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#334155' }}>{s.total}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#334155' }}>{s.closed}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>{s.closeRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>Chưa có Sale nào trong hệ thống</div>
          )}
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#2563eb" /> Hiệu suất người báo giá
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Thời gian trung bình báo giá & xử lý của từng Order</span>

          {pricerStats.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Order</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Đã xử lý</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>TB báo giá</th>
                    <th style={{ padding: '8px 10px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>TB xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {pricerStats.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>{p.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#334155' }}>{p.totalHandled}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0f766e', fontWeight: 700 }}>
                        {p.avgQuoteMs !== null ? formatDuration(p.avgQuoteMs) : '---'}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#334155', fontWeight: 700 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#94a3b8" />
                          {p.avgProcessMs !== null ? formatDuration(p.avgProcessMs) : '---'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>Chưa có Order nào trong hệ thống</div>
          )}
        </div>
      </div>

      {/* 2.3 + 2.4 gộp — Top hành động theo role (Audit Log) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} color="#2563eb" /> Top hành động theo role
        </h2>
      
        {Object.keys(actionStats).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(actionStats).length}, 1fr)`, gap: '20px', marginTop: '14px' }}>
            {Object.entries(actionStats).map(([role, actions]) => {
              const maxCount = actions[0]?.count || 1;
              return (
                <div key={role}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {ROLE_LABEL[role] || role}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {actions.slice(0, 6).map((a) => {
                      const key = `${role}:${a.action}`;
                      const isOpen = expandedAction === key;
                      return (
                        <div key={a.action}>
                          <div
                            onClick={() => setExpandedAction(isOpen ? null : key)}
                            style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#334155', marginBottom: '3px', cursor: 'pointer' }}
                          >
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ACTION_LABEL[a.action] || a.action}</span>
                            <span style={{ fontWeight: 900, color: '#0f172a', flexShrink: 0, marginLeft: '8px' }}>{a.count}</span>
                          </div>
                          <div
                            onClick={() => setExpandedAction(isOpen ? null : key)}
                            style={{ background: '#f1f5f9', borderRadius: '6px', height: '6px', overflow: 'hidden', cursor: 'pointer' }}
                          >
                            <div style={{ width: `${(a.count / maxCount) * 100}%`, background: isOpen ? '#0f172a' : '#2563eb', height: '100%', borderRadius: '6px' }} />
                          </div>
                          {isOpen && (
                            <div style={{ marginTop: '6px', padding: '8px 10px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {a.byActor.map((actor) => (
                                <div key={actor.actorId || actor.actorName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ color: '#334155', fontWeight: 600 }}>{actor.actorName}</span>
                                  <span style={{ color: '#64748b', fontWeight: 700 }}>{actor.count} lần</span>
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
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '24px 0' }}>Chưa có dữ liệu hành động nào được ghi nhận</div>
        )}
      </div>
    </div>
  );
};
