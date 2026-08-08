import React, { useState, useRef, useEffect } from 'react';
import type { Role, User } from '../types';
import { Sparkles, LogOut, User as UserIcon, Menu, ChevronDown, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  user: User;
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onOpenCreateModal: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  onRoleChange,
  onOpenCreateModal,
  onLogout,
  onToggleSidebar,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials for circular avatar (e.g. "Trần Văn Pricing" -> "TV")
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="titlebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#1e293b',
          }}
          title="Toggle Navigation Menu"
        >
          <Menu size={18} />
        </button>

        <div className="brand">
          <span className="brand-mark">VCB QMS</span>
          <div>
            <strong style={{ color: '#0f172a' }}>Hệ Thống Báo Giá Chế Tác Kim Hoàn</strong>
          </div>
        </div>
      </div>

      {/* Right Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
        {/* Circular Avatar Dropdown Trigger */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '24px',
              padding: '4px 12px 4px 4px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Circular Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)',
              }}
            >
              {getInitials(user.name)}
            </div>

            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#2563eb' }}>
                {currentRole} {user.department ? `• ${user.department.name}` : ''}
              </span>
            </div>

            <ChevronDown size={14} color="#64748b" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
          </button>

          {/* Popup Dropdown Menu */}
          {isDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '230px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                padding: '8px',
                zIndex: 1000,
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* User Summary Header */}
              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '6px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{user.name}</div>
                <div style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>{user.email}</div>
                <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                  <ShieldCheck size={11} /> {user.role}
                </div>
              </div>

              {/* Menu Item: Profile */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setShowProfileModal(true);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#334155',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="dropdown-item-hover"
              >
                <UserIcon size={15} color="#2563eb" /> Hồ Sơ Cá Nhân
              </button>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

              {/* Menu Item: Logout */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} color="#dc2626" /> Đăng Xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfileModal && (
        <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserIcon size={18} color="#2563eb" /> Thông Tin Tài Khoản
              </h3>
              <button className="icon-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: 'white', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px auto' }}>
                  {getInitials(user.name)}
                </div>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{user.name}</strong>
                <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '12px' }}>{user.email}</p>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Mã tài khoản:</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{user.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Vai trò (Role):</span>
                  <span style={{ fontWeight: 800, color: '#2563eb' }}>{user.role}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Phòng ban:</span>
                  <span style={{ fontWeight: 700 }}>{user.department?.name || '---'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn-insp btn-insp-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => setShowProfileModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
