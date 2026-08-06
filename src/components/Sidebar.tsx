import React, { useState } from 'react';
import type { Role, User } from '../types';
import {
  LayoutDashboard,
  PlusCircle,
  UserCheck,
  Package,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Layers,
  Calculator,
  RotateCcw,
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
  onOpenCreate,
  isOpen,
  onCloseMobile,
}) => {
  const [isStatusExpanded, setIsStatusExpanded] = useState<boolean>(false);

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

        {/* 2. + Tạo Yêu Cầu (Chỉ dành cho Sale và Admin - Hide for Pricing) */}
        {(currentRole === 'SALE' || currentRole === 'ADMIN') && (
          <button
            onClick={() => {
              onOpenCreate();
              onCloseMobile?.();
            }}
            style={{ color: '#2563eb', fontWeight: 700 }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlusCircle size={17} color="#2563eb" /> Tạo Yêu Cầu Mới
            </span>
          </button>
        )}

        {/* 3. Yêu cầu của tôi */}
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

        {/* 4. Collapsible Accordion Status Dropdown Menu */}
        <button
          type="button"
          onClick={() => setIsStatusExpanded(!isStatusExpanded)}
          style={{ justifyContent: 'space-between', fontWeight: 700 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={17} color="#475569" /> Trạng Thái Yêu Cầu
          </span>
          <ChevronDown
            size={15}
            style={{
              transform: isStatusExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
            }}
          />
        </button>

        {/* Smooth Submenu Status List */}
        <div className={`status-submenu ${isStatusExpanded ? 'expanded' : ''}`}>
          <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px', borderLeft: '2px solid #cbd5e1', marginLeft: '12px' }}>
            <button
              className={currentFilter === 'YC_MOI' ? 'active' : ''}
              onClick={() => {
                onFilterChange('YC_MOI');
                onCloseMobile?.();
              }}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Inbox size={14} style={{ color: '#2563eb' }} /> Yêu Cầu Mới
              </span>
              <span className="nav-badge" style={{ fontSize: '10px' }}>{counts.ycMoi}</span>
            </button>

            <button
              className={currentFilter === 'DANG_XLY' ? 'active' : ''}
              onClick={() => {
                onFilterChange('DANG_XLY');
                onCloseMobile?.();
              }}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} style={{ color: '#b45309' }} /> Đang Xử Lý
              </span>
              <span className="nav-badge" style={{ fontSize: '10px' }}>{counts.dangXly}</span>
            </button>

            <button
              className={currentFilter === 'NEED_MORE_INFO' ? 'active' : ''}
              onClick={() => {
                onFilterChange('NEED_MORE_INFO');
                onCloseMobile?.();
              }}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={14} style={{ color: '#ea580c' }} /> Cần Bổ Sung
              </span>
              <span className="nav-badge" style={{ fontSize: '10px', background: '#fff7ed', color: '#ea580c', fontWeight: 800 }}>{counts.needMoreInfo}</span>
            </button>

            <button
              className={currentFilter === 'XONG' ? 'active' : ''}
              onClick={() => {
                onFilterChange('XONG');
                onCloseMobile?.();
              }}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> Đã Báo Giá
              </span>
              <span className="nav-badge" style={{ fontSize: '10px' }}>{counts.xong}</span>
            </button>

            <button
              className={currentFilter === 'TU_CHOI' ? 'active' : ''}
              onClick={() => {
                onFilterChange('TU_CHOI');
                onCloseMobile?.();
              }}
              style={{ fontSize: '12px', padding: '7px 10px' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={14} style={{ color: '#dc2626' }} /> Từ Chối
              </span>
              <span className="nav-badge" style={{ fontSize: '10px' }}>{counts.tuChoi}</span>
            </button>
          </div>
        </div>

        <div style={{ height: '1px', background: '#f1f5f9', margin: '6px 0' }} />

        {/* 5. Thư viện sản phẩm (Các sản phẩm đã báo giá hoàn tất) */}
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

        {/* 6. Máy tính giá (thay cho vị trí Thông báo cũ) */}
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
