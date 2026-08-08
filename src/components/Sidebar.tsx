import React from 'react';
import type { Role, User } from '../types';
import {
  LayoutDashboard,
  UserCheck,
  Package,
  Calculator,
} from 'lucide-react';

interface SidebarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    total: number;
    myReq: number;
    ycMoi: number;
    dangXly: number;
    needMoreInfo: number;
    xong: number;
    tuChoi: number;
  };
  user: User;
  currentRole: Role;
  onOpenCreate: () => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  counts,
  user,
  currentRole,
  isOpen,
  onCloseMobile,
}) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <nav className="sidebar-nav">
        {/* 1. Tổng quan */}
        <button
          className={currentFilter === 'ALL' ? 'active' : ''}
          onClick={() => {
            onFilterChange('ALL');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutDashboard size={17} /> Tổng Quan
          </span>
          <span className="nav-badge">{counts.total}</span>
        </button>

        {/* 2. Yêu cầu của tôi */}
        <button
          className={currentFilter === 'MY_REQ' ? 'active' : ''}
          onClick={() => {
            onFilterChange('MY_REQ');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={17} style={{ color: '#4f46e5' }} /> Yêu Cầu Của Tôi
          </span>
          <span className="nav-badge" style={{ background: '#e0e7ff', color: '#3730a3', fontWeight: 800 }}>
            {counts.myReq}
          </span>
        </button>

        <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0' }} />

        {/* 3. Thư viện sản phẩm (Các sản phẩm đã báo giá hoàn tất) */}
        <button
          className={currentFilter === 'LIBRARY' ? 'active' : ''}
          onClick={() => {
            onFilterChange('LIBRARY');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={17} color="#16a34a" /> Thư Viện Sản Phẩm
          </span>
          <span className="nav-badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800 }}>
            {counts.xong}
          </span>
        </button>

        {/* 4. Máy tính giá */}
        <button
          className={currentFilter === 'CALCULATOR' ? 'active' : ''}
          onClick={() => {
            onFilterChange('CALCULATOR');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calculator size={17} color="#d97706" /> Máy Tính Giá
          </span>
        </button>
      </nav>

      {/* Bottom SLA Card */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginTop: 'auto' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          SLA HÔM NAY
        </span>
        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', margin: '3px 0' }}>
          {counts.ycMoi + counts.dangXly} Cần Báo Giá
        </div>
        <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
          {user.name} ({currentRole})
        </p>
      </div>
    </aside>
  );
};
