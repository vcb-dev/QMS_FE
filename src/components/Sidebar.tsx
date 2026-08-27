import React from 'react';
import type { Role, User, StatusCounts } from '../types';
import {
  LayoutDashboard,
  FileText,
  Package,
  Calculator,
  Users,
  Contact,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts: StatusCounts;
  user: User;
  currentRole: Role;
  onOpenCreate: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  counts: _counts,
  user: _user,
  currentRole,
}) => {
  return (
    <aside
      className="sidebar"
      style={{
        background: '#111927',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
      }}
    >
      {/* Brand Mark in Sidebar top matching screenshot */}
      <button
        type="button"
        onClick={() => onFilterChange('OVERVIEW')}
        title="Về trang chính"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '64px',
          padding: '0 12px',
          boxSizing: 'border-box',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
          background: 'transparent',
          border: 'none',
          borderBottomWidth: '1px',
          borderBottomColor: 'rgba(255, 255, 255, 0.08)',
          borderBottomStyle: 'solid',
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '5px 8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            flexShrink: 0,
          }}
        >
          <img
            src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
            alt="Viễn Chí Bảo"
            style={{ height: '24px', objectFit: 'contain' }}
          />
        </div>
        <span className="sidebar-brand-text" style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
          VCB QMS
        </span>
      </button>

      <nav className="sidebar-nav">
        {/* 1. Tổng Quan */}
        <button
          className={currentFilter === 'OVERVIEW' ? 'active' : ''}
          onClick={() => onFilterChange('OVERVIEW')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LayoutDashboard size={18} /> <span className="nav-label">Tổng Quan</span>
          </span>
        </button>

        {/* 2. Danh Sách Yêu Cầu Báo Giá */}
        <button
          className={currentFilter !== 'OVERVIEW' && currentFilter !== 'LIBRARY' && currentFilter !== 'CALCULATOR' && currentFilter !== 'STAFF' && currentFilter !== 'CUSTOMERS' && currentFilter !== 'PRICING_CONFIG' ? 'active' : ''}
          onClick={() => onFilterChange('ALL')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={18} /> <span className="nav-label">Danh Sách Yêu Cầu Báo Giá</span>
          </span>
        </button>

        {/* 2b. Quản Lý Nhân Viên — chỉ Admin */}
        {currentRole === 'ADMIN' && (
          <button
            className={currentFilter === 'STAFF' ? 'active' : ''}
            onClick={() => onFilterChange('STAFF')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={18} /> <span className="nav-label">Quản Lý Nhân Viên</span>
            </span>
          </button>
        )}

        {/* 2c. Quản Lý Khách Hàng — chỉ Admin */}
        {currentRole === 'ADMIN' && (
          <button
            className={currentFilter === 'CUSTOMERS' ? 'active' : ''}
            onClick={() => onFilterChange('CUSTOMERS')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Contact size={18} /> <span className="nav-label">Quản Lý Khách Hàng</span>
            </span>
          </button>
        )}

        {/* 3. Quản Lý Sản Phẩm */}
        <button
          className={currentFilter === 'LIBRARY' ? 'active' : ''}
          onClick={() => onFilterChange('LIBRARY')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={18} /> <span className="nav-label">{currentRole === 'SALE' ? 'Thư Viện Sản Phẩm' : 'Quản Lý Sản Phẩm'}</span>
          </span>
        </button>

        {/* 4. Máy Tính Giá */}
        <button
          className={currentFilter === 'CALCULATOR' ? 'active' : ''}
          onClick={() => onFilterChange('CALCULATOR')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calculator size={18} /> <span className="nav-label">Máy Tính Giá</span>
          </span>
        </button>

        {/* 5. Cấu Hình Giá — chỉ ORDER/ADMIN */}
        {(currentRole === 'ORDER' || currentRole === 'ADMIN') && (
          <button
            className={currentFilter === 'PRICING_CONFIG' ? 'active' : ''}
            onClick={() => onFilterChange('PRICING_CONFIG')}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings size={18} /> <span className="nav-label">Cấu Hình Giá</span>
            </span>
          </button>
        )}

      </nav>
    </aside>
  );
};
