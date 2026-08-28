import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Role, User, QuoteRequest, HeaderSearchProduct } from '../types';
import { LogOut, User as UserIcon, ShieldCheck, Bell, X, Search, ChevronRight } from 'lucide-react';
import { fetchQuoteRequests } from '../services/api';
import { StatusPill } from './StatusPill';
import { STATUS_BADGE_META } from '../constants';
import { formatCurrency } from '../utils/currency';
import { renderPriceBreakdownLines } from '../utils/priceBreakdown';

const SEARCH_SECTION_LIMIT = 5;

interface HeaderProps {
  user: User;
  currentRole: Role;
  onOpenCreateModal: () => void;
  onLogout: () => void;
  onSelectReq: (id: string) => void;
  onSearchRequests: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentRole,
  onLogout,
  onSelectReq,
  onSearchRequests,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search tổng — chỉ hiện ở trang Tổng Quan (path "/"), gộp chung kết quả Yêu Cầu (mã đơn/tên
  // khách hàng) và Sản Phẩm (danh mục/chất liệu đã báo giá) từ CÙNG 1 lượt gọi API search sẵn có.
  const location = useLocation();
  const navigate = useNavigate();
  const showSearch = location.pathname === '/';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuoteRequest[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const searchRequestIdRef = useRef(0);
  // Dropdown render qua Portal thẳng vào document.body (xem lý do ở JSX bên dưới) — tọa độ đo
  // trực tiếp từ ô input mỗi lần mở, không phụ thuộc CSS/stacking context của cha.
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const openDropdownAtCurrentPosition = () => {
    if (searchWrapRef.current) {
      const rect = searchWrapRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
    setSearchOpen(true);
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const myId = ++searchRequestIdRef.current;
    const timer = setTimeout(() => {
      fetchQuoteRequests({ search: q, limit: 12 })
        .then((res) => {
          if (myId !== searchRequestIdRef.current) return;
          setSearchResults(res?.data || []);
          openDropdownAtCurrentPosition();
        })
        .catch(() => {
          if (myId === searchRequestIdRef.current) setSearchResults([]);
        })
        .finally(() => {
          if (myId === searchRequestIdRef.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // "Sản phẩm" — mỗi phương án ĐÃ BÁO GIÁ (quotedPrice != null) của đơn QUOTED/CLOSED trong
  // cùng kết quả search ở trên là 1 sản phẩm, giống cách LibraryPage dựng thẻ sản phẩm.
  const productResults = useMemo<HeaderSearchProduct[]>(() => {
    const items: HeaderSearchProduct[] = [];
    for (const r of searchResults) {
      if (r.status !== 'QUOTED' && r.status !== 'CLOSED') continue;
      const catName = r.category?.name || '';
      for (const o of r.options || []) {
        if (o.quotedPrice == null) continue;
        const matStr =
          o.materials && o.materials.length > 0
            ? o.materials.map((m) => m.materialName || m.material?.name).filter(Boolean).join(', ')
            : o.materialName || '';
        items.push({
          key: `${r.id}:${o.id || matStr}`,
          requestId: r.id,
          productName: `${catName} ${matStr}`.trim() || r.productName || 'Sản phẩm chế tác',
          price: Number(o.quotedPrice),
          materialPrice: o.priceBreakdown ? o.priceBreakdown.material
            : (o.quotedPrice != null && o.stonePrice != null ? Number(o.quotedPrice) - Number(o.stonePrice) : null),
          stonePrice: o.priceBreakdown ? o.priceBreakdown.stone
            : (o.stonePrice != null ? Number(o.stonePrice) : null),
        });
      }
    }
    return items;
  }, [searchResults]);

  useEffect(() => {
    const handleClickOutsideSearch = (event: MouseEvent) => {
      const target = event.target as Node;
      // Dropdown portal vào document.body nên KHÔNG nằm trong DOM con của searchWrapRef — phải
      // check thêm ref riêng của nó, nếu không mousedown vào 1 kết quả sẽ bị coi là "click ra
      // ngoài" và đóng dropdown trước khi onClick của kết quả kịp chạy.
      if (searchWrapRef.current?.contains(target)) return;
      if (dropdownContentRef.current?.contains(target)) return;
      setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, []);

  const handleSelectSearchResult = (id: string) => {
    setSearchOpen(false);
    onSelectReq(id);
  };

  const handleViewMoreRequests = () => {
    setSearchOpen(false);
    onSearchRequests(searchQuery.trim());
  };

  const handleViewMoreProducts = () => {
    setSearchOpen(false);
    navigate(`/library?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Sản phẩm khác Yêu Cầu — bấm vào phải qua Thư Viện Sản Phẩm (lọc đúng tên sản phẩm đó),
  // không nhảy qua Chi Tiết đơn như Yêu Cầu.
  const handleSelectProductResult = (productName: string) => {
    setSearchOpen(false);
    navigate(`/library?q=${encodeURIComponent(productName)}`);
  };

  // Get user initials for circular avatar (e.g. "Nguyen Van A" -> "NA")
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

  const requestSection = searchResults.slice(0, SEARCH_SECTION_LIMIT);
  const productSection = productResults.slice(0, SEARCH_SECTION_LIMIT);

  return (
    <header className="titlebar" style={{ position: 'relative', background: '#ffffff', borderBottom: '1px solid #e2e8f0', height: '64px', padding: '0 24px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>

      {/* Search tổng — chỉ hiện ở Tổng Quan, canh giữa header. Gộp 2 mục: Yêu Cầu (mã đơn/tên
          khách hàng) và Sản Phẩm (danh mục/chất liệu đã báo giá) từ cùng 1 kết quả search. */}
      {showSearch && (
        <div ref={searchWrapRef} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '360px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) openDropdownAtCurrentPosition(); }}
              placeholder="Tìm yêu cầu, sản phẩm, khách hàng..."
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '12.5px',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {searchOpen && searchQuery.trim() && dropdownPos && createPortal(
            <div
              ref={dropdownContentRef}
              style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                transform: 'translateX(-50%)',
                width: '420px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                maxHeight: '440px',
                overflowY: 'auto',
                zIndex: 3000,
                padding: '6px',
              }}
            >
              {searching && (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>Đang tìm...</div>
              )}

              {!searching && requestSection.length === 0 && productSection.length === 0 && (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>Không tìm thấy kết quả</div>
              )}

              {!searching && requestSection.length > 0 && (
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ padding: '8px 10px 4px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Yêu Cầu
                  </div>
                  {requestSection.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(r.id)}
                      className="dropdown-item-hover"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{r.code}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.customer?.name || 'Chưa rõ khách hàng'}
                          {(r.materials && r.materials.length > 0) || r.material
                            ? ` · ${(r.materials && r.materials.length > 0 ? r.materials.map((m) => m.name) : [r.material!.name]).join(', ')}`
                            : ''}
                        </div>
                      </div>
                      <StatusPill status={r.status} label={STATUS_BADGE_META[r.status]?.label || r.status} iconSize={11} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleViewMoreRequests}
                    className="dropdown-item-hover"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#b45309',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Xem thêm yêu cầu <ChevronRight size={13} />
                  </button>
                </div>
              )}

              {!searching && productSection.length > 0 && (
                <div>
                  <div style={{ padding: '8px 10px 4px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', borderTop: requestSection.length > 0 ? '1px solid #f1f5f9' : 'none', marginTop: requestSection.length > 0 ? '4px' : 0, paddingTop: requestSection.length > 0 ? '10px' : '4px' }}>
                    Sản Phẩm
                  </div>
                  {productSection.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectProductResult(p.productName)}
                      className="dropdown-item-hover"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ minWidth: 0, fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.productName}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#b45309' }}>
                          {formatCurrency(p.price)}
                        </div>
                        {p.materialPrice != null && renderPriceBreakdownLines({ material: p.materialPrice, stone: p.stonePrice ?? 0 })}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleViewMoreProducts}
                    className="dropdown-item-hover"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#b45309',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Xem thêm sản phẩm <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>,
            document.body,
          )}
        </div>
      )}

      {/* Right Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Bell notification button */}
        <button
          type="button"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: '#475569',
          }}
          title="Notifications"
        >
          <Bell size={17} />
          <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', background: '#ef4444', borderRadius: '50%', border: '1.5px solid #ffffff' }} />
        </button>

        {/* Profile Avatar Dropdown Trigger */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              background: 'transparent',
              border: 'none',
              padding: '2px 4px',
              cursor: 'pointer',
            }}
          >
            <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                {user.name || 'Nguyen Van A'}
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>
                {currentRole === 'SALE' ? 'Store Associate' : currentRole === 'ORDER' ? 'Order Specialist' : 'System Admin'}
              </span>
            </div>

            {/* Circular Avatar */}
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {getInitials(user.name)}
            </div>
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

              {/* Xem thử giao diện theo góc nhìn Sale/Order/Admin — chỉ Admin mới thấy */}
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
              <button className="icon-btn" onClick={() => setShowProfileModal(false)}><X size={18} /></button>
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
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{user.role}</span>
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
