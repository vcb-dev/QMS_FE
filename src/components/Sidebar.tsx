import React from 'react';
import type { Role, User } from '../types';
import { ClipboardList, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface SidebarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    xong: number;
    tuChoi: number;
  };
  user: User;
  currentRole: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  counts,
  user,
  currentRole,
}) => {
  const myTabLabel =
    currentRole === 'PRICING'
      ? 'Đơn Xử Lý Của Tôi'
      : currentRole === 'SALE'
        ? 'Yêu Cầu Của Tôi'
        : 'Đơn Của Tôi';

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <button
          className={currentFilter === 'ALL' ? 'active' : ''}
          onClick={() => onFilterChange('ALL')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={16} /> Tất Cả Yêu Cầu
          </span>
          <span className="nav-badge">{counts.total}</span>
        </button>

        <button
          className={currentFilter === 'MY_REQ' ? 'active' : ''}
          onClick={() => onFilterChange('MY_REQ')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={16} style={{ color: '#2563eb' }} /> {myTabLabel}
          </span>
          <span className="nav-badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 800 }}>
            {counts.myReq}
          </span>
        </button>

        <button
          className={currentFilter === 'YC_MOI' ? 'active' : ''}
          onClick={() => onFilterChange('YC_MOI')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#d97706' }} /> YC Mới (Chờ Xử Lý)
          </span>
          <span className="nav-badge">{counts.ycMoi}</span>
        </button>

        <button
          className={currentFilter === 'DANG_XLY' ? 'active' : ''}
          onClick={() => onFilterChange('DANG_XLY')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ color: '#4338ca' }} /> Đang Xử Lý
          </span>
          <span className="nav-badge">{counts.dangXly}</span>
        </button>

        <button
          className={currentFilter === 'XONG' ? 'active' : ''}
          onClick={() => onFilterChange('XONG')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> Đã Báo Giá
          </span>
          <span className="nav-badge">{counts.xong}</span>
        </button>

        <button
          className={currentFilter === 'TU_CHOI' ? 'active' : ''}
          onClick={() => onFilterChange('TU_CHOI')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={16} style={{ color: '#dc2626' }} /> Từ Chối
          </span>
          <span className="nav-badge">{counts.tuChoi}</span>
        </button>
      </nav>

      <div className="sidebar-status">
        <span className="eyebrow">Tài Khoản Đang Đăng Nhập</span>
        <strong>{user.name}</strong>
        <p>{user.email}</p>
        <p style={{ color: '#2563eb', fontWeight: 700, marginTop: '3px' }}>
          Vai trò: {currentRole} {user.department ? `(${user.department.name})` : ''}
        </p>
      </div>
    </aside>
  );
};
