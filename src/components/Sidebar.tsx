import React from 'react';
import { clsx } from 'clsx';
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

import { navBtnBaseCls, navBtnActiveCls, navLabelCls } from '../styles/classNames';

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onFilterChange,
  counts: _counts,
  user: _user,
  currentRole,
}) => {
  return (
    <aside
      className="group/sidebar fixed left-0 top-0 bottom-0 h-screen z-[100] w-[72px] min-w-[72px] shrink-0 flex flex-col justify-start overflow-x-hidden overflow-y-auto box-border !bg-white !border-r !border-[#e2e8f0] shadow-[2px_0_8px_rgba(0,0,0,0.04)] !pt-0 !pr-[12px] !pb-[16px] !pl-[12px] transition-[width,min-width,padding,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:w-[260px] hover:min-w-[260px] hover:!pr-[16px] hover:!pl-[16px] hover:shadow-[4px_0_24px_rgba(0,0,0,0.12)] text-[#0f172a]"
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
        <span className="text-[15px] font-extrabold text-[#0f172a] tracking-[-0.2px] opacity-0 whitespace-nowrap transition-opacity duration-150 group-hover/sidebar:opacity-100">
          Viễn Chí Bảo 
        </span>
      </button>

      <nav className="flex flex-col gap-[6px]">
        {/* 1. Tổng Quan */}
        <button
          className={clsx(navBtnBaseCls, currentFilter === 'OVERVIEW' && navBtnActiveCls)}
          onClick={() => onFilterChange('OVERVIEW')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <LayoutDashboard size={18} /> <span className={navLabelCls}>Tổng Quan</span>
          </span>
        </button>

        {/* 2. Danh Sách Yêu Cầu Báo Giá */}
        <button
          className={clsx(
            navBtnBaseCls,
            currentFilter !== 'OVERVIEW' &&
              currentFilter !== 'LIBRARY' &&
              currentFilter !== 'CALCULATOR' &&
              currentFilter !== 'STAFF' &&
              currentFilter !== 'CUSTOMERS' &&
              currentFilter !== 'PRICING_CONFIG' &&
              currentFilter !== 'NOTIFICATION_CONFIG' &&
              navBtnActiveCls,
          )}
          onClick={() => onFilterChange('ALL')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <FileText size={18} /> <span className={navLabelCls}>Danh Sách Yêu Cầu Báo Giá</span>
          </span>
        </button>

        {/* 2b. Quản Lý Nhân Viên — chỉ Admin */}
        {currentRole === 'ADMIN' && (
          <button
            className={clsx(navBtnBaseCls, currentFilter === 'STAFF' && navBtnActiveCls)}
            onClick={() => onFilterChange('STAFF')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Users size={18} /> <span className={navLabelCls}>Quản Lý Nhân Viên</span>
            </span>
          </button>
        )}

        {/* 2c. Quản Lý Khách Hàng — chỉ Admin */}
        {currentRole === 'ADMIN' && (
          <button
            className={clsx(navBtnBaseCls, currentFilter === 'CUSTOMERS' && navBtnActiveCls)}
            onClick={() => onFilterChange('CUSTOMERS')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Contact size={18} /> <span className={navLabelCls}>Quản Lý Khách Hàng</span>
            </span>
          </button>
        )}

        {/* 3. Quản Lý Sản Phẩm */}
        <button
          className={clsx(navBtnBaseCls, currentFilter === 'LIBRARY' && navBtnActiveCls)}
          onClick={() => onFilterChange('LIBRARY')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <Package size={18} /> <span className={navLabelCls}>{currentRole === 'SALE' ? 'Thư Viện Sản Phẩm' : 'Quản Lý Sản Phẩm'}</span>
          </span>
        </button>

        {/* 4. Máy Tính Giá */}
        <button
          className={clsx(navBtnBaseCls, currentFilter === 'CALCULATOR' && navBtnActiveCls)}
          onClick={() => onFilterChange('CALCULATOR')}
        >
          <span className="flex items-center gap-[12px] min-w-0 flex-1">
            <Calculator size={18} /> <span className={navLabelCls}>Máy Tính Giá</span>
          </span>
        </button>

        {/* 5. Cấu Hình Giá — chỉ ORDER/ADMIN */}
        {(currentRole === 'ORDER' || currentRole === 'ADMIN') && (
          <button
            className={clsx(navBtnBaseCls, currentFilter === 'PRICING_CONFIG' && navBtnActiveCls)}
            onClick={() => onFilterChange('PRICING_CONFIG')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Settings size={18} /> <span className={navLabelCls}>Cấu Hình Giá</span>
            </span>
          </button>
        )}

        {/* 6. Cấu Hình Thông Báo — chỉ ADMIN */}
        {currentRole === 'ADMIN' && (
          <button
            className={clsx(navBtnBaseCls, currentFilter === 'NOTIFICATION_CONFIG' && navBtnActiveCls)}
            onClick={() => onFilterChange('NOTIFICATION_CONFIG')}
          >
            <span className="flex items-center gap-[12px] min-w-0 flex-1">
              <Bell size={18} /> <span className={navLabelCls}>Cấu Hình Thông Báo</span>
            </span>
          </button>
        )}

      </nav>
    </aside>
  );
};
