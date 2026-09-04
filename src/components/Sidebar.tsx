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
  Bell,
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
      className="sidebar bg-white border-r border-[#e2e8f0] text-[#0f172a]"
    >
      {/* Brand Mark in Sidebar top matching screenshot */}
      <button
        type="button"
        onClick={() => onFilterChange('OVERVIEW')}
        title="Về trang chính"
        className="flex items-center gap-[12px] h-[64px] px-[12px] box-border border-0 border-b border-[#e2e8f0] mb-[16px] bg-transparent w-full cursor-pointer text-left"
      >
        <div
          className="bg-transparent p-0 rounded-[8px] flex items-center justify-center shrink-0"
        >
          <img
            src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
            alt="Viễn Chí Bảo"
            className="h-[24px] object-contain"
          />
        </div>
        <span className="sidebar-brand-text text-[15px] font-extrabold text-[#0f172a] tracking-[-0.2px]">
          Viễn Chí Bảo 
        </span>
      </button>

      <nav className="sidebar-nav">
        {/* 1. Tổng Quan */}
        <button
          className={currentFilter === 'OVERVIEW' ? 'active' : ''}
          onClick={() => onFilterChange('OVERVIEW')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <LayoutDashboard size={18} /> <span className="nav-label">Tổng Quan</span>
          </span>
        </button>

        {/* 2. Danh Sách Yêu Cầu Báo Giá */}
        <button
          className={currentFilter !== 'OVERVIEW' && currentFilter !== 'LIBRARY' && currentFilter !== 'CALCULATOR' && currentFilter !== 'STAFF' && currentFilter !== 'CUSTOMERS' && currentFilter !== 'PRICING_CONFIG' && currentFilter !== 'NOTIFICATION_CONFIG' ? 'active' : ''}
          onClick={() => onFilterChange('ALL')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <FileText size={18} /> <span className="nav-label">Danh Sách Yêu Cầu Báo Giá</span>
          </span>
        </button>

        {/* 2b. Quản Lý Nhân Viên — chỉ Admin */}
        {currentRole === 'ADMIN' && (
          <button
            className={currentFilter === 'STAFF' ? 'active' : ''}
            onClick={() => onFilterChange('STAFF')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
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
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Contact size={18} /> <span className="nav-label">Quản Lý Khách Hàng</span>
            </span>
          </button>
        )}

        {/* 3. Quản Lý Sản Phẩm */}
        <button
          className={currentFilter === 'LIBRARY' ? 'active' : ''}
          onClick={() => onFilterChange('LIBRARY')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <Package size={18} /> <span className="nav-label">{currentRole === 'SALE' ? 'Thư Viện Sản Phẩm' : 'Quản Lý Sản Phẩm'}</span>
          </span>
        </button>

        {/* 4. Máy Tính Giá */}
        <button
          className={currentFilter === 'CALCULATOR' ? 'active' : ''}
          onClick={() => onFilterChange('CALCULATOR')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <Calculator size={18} /> <span className="nav-label">Máy Tính Giá</span>
          </span>
        </button>

        {/* 5. Cấu Hình Giá — chỉ ORDER/ADMIN */}
        {(currentRole === 'ORDER' || currentRole === 'ADMIN') && (
          <button
            className={currentFilter === 'PRICING_CONFIG' ? 'active' : ''}
            onClick={() => onFilterChange('PRICING_CONFIG')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Settings size={18} /> <span className="nav-label">Cấu Hình Giá</span>
            </span>
          </button>
        )}

        {/* 6. Cấu Hình Thông Báo — chỉ ADMIN */}
        {currentRole === 'ADMIN' && (
          <button
            className={currentFilter === 'NOTIFICATION_CONFIG' ? 'active' : ''}
            onClick={() => onFilterChange('NOTIFICATION_CONFIG')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Bell size={18} /> <span className="nav-label">Cấu Hình Thông Báo</span>
            </span>
          </button>
        )}

      </nav>
    </aside>
  );
};
