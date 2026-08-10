import React from 'react';
import type { Role, User } from '../types';
import {
  LayoutDashboard,
  FileText,
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
  user: _user,
  currentRole,
  isOpen,
  onCloseMobile,
}) => {
  return (
    <aside
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        background: '#111927',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#ffffff',
      }}
    >
      {/* Brand Mark in Sidebar top matching screenshot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '64px',
          padding: '0 12px',
          boxSizing: 'border-box',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '16px',
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
          }}
        >
          <img
            src="https://vienchibao.com/wp-content/uploads/2025/01/logo.png"
            alt="Viễn Chí Bảo"
            style={{ height: '24px', objectFit: 'contain' }}
          />
        </div>
        <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
          VCB QMS
        </span>
      </div>

      <nav className="sidebar-nav">
        {/* 1. Tổng Quan */}
        <button
          className={currentFilter === 'ALL' ? 'active' : ''}
          onClick={() => {
            onFilterChange('ALL');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LayoutDashboard size={18} /> Tổng Quan
          </span>
        </button>

        {/* 2. Yêu Cầu Của Tôi */}
        <button
          className={currentFilter === 'MY_REQ' ? 'active' : ''}
          onClick={() => {
            onFilterChange('MY_REQ');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={18} /> Yêu Cầu Của Tôi
          </span>
          {counts.myReq > 0 && <span className="nav-badge">{counts.myReq}</span>}
        </button>

        {/* 3. Thư Viện Sản Phẩm */}
        <button
          className={currentFilter === 'LIBRARY' ? 'active' : ''}
          onClick={() => {
            onFilterChange('LIBRARY');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={18} /> Thư Viện Sản Phẩm
          </span>
        </button>

        {/* 4. Máy Tính Giá */}
        <button
          className={currentFilter === 'CALCULATOR' ? 'active' : ''}
          onClick={() => {
            onFilterChange('CALCULATOR');
            onCloseMobile?.();
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calculator size={18} /> Máy Tính Giá
          </span>
        </button>
      </nav>

      {/* Bottom Role Card matching screenshot */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginTop: 'auto',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#64748b',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            display: 'block',
          }}
        >
          CURRENT ROLE
        </span>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
          {currentRole === 'SALE'
            ? 'Sale - Cửa hàng'
            : currentRole === 'PRICING'
            ? 'Pricing - Xưởng chế tác'
            : 'Admin - Quản trị'}
        </div>
      </div>
    </aside>
  );
};
