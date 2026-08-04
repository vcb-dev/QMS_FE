import React from 'react';
import type { Role, User } from '../types';
import { Search, Sparkles, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onOpenCreateModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  onRoleChange,
  searchTerm,
  onSearchChange,
  onOpenCreateModal,
  onLogout,
}) => {
  return (
    <header className="titlebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="brand">
          <span className="brand-mark">VCB QMS</span>
          <div>
            <strong style={{ color: '#0f172a' }}>Hệ Thống Báo Giá Chế Tác Kim Hoàn</strong>
            <small style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              🟢 Authenticated ({user.email})
            </small>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="global-search">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm theo Mã QG, Tên SP, Khách hàng..."
        />
      </div>

      {/* Profile & Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '5px 14px', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
          <UserIcon size={14} color="#64748b" />
          <div style={{ fontSize: '12px' }}>
            <strong style={{ color: '#0f172a', display: 'block', lineHeight: '1.2' }}>{user.name}</strong>
            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
              {user.role} {user.department ? `• ${user.department.name}` : ''}
            </span>
          </div>
        </div>

        {/* Allow switching views ONLY if user.role === 'ADMIN' */}
        {user.role === 'ADMIN' && (
          <div className="role-switch">
            <button
              className={currentRole === 'SALE' ? 'active' : ''}
              onClick={() => onRoleChange('SALE')}
            >
              Sale
            </button>
            <button
              className={currentRole === 'PRICING' ? 'active' : ''}
              onClick={() => onRoleChange('PRICING')}
            >
              Pricing
            </button>
            <button
              className={currentRole === 'ADMIN' ? 'active' : ''}
              onClick={() => onRoleChange('ADMIN')}
            >
              Admin
            </button>
          </div>
        )}

        {(user.role === 'SALE' || user.role === 'ADMIN') && (
          <button className="primary-action" onClick={onOpenCreateModal}>
            <Sparkles size={16} /> Tạo YC Báo Giá
          </button>
        )}

        <button
          onClick={onLogout}
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={14} /> Đăng Xuất
        </button>
      </div>
    </header>
  );
};
