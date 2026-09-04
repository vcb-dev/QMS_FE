import React, { useState, useRef, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Role, User, QuoteRequest, HeaderSearchProduct } from '../types';
import { LogOut, User as UserIcon, ShieldCheck, Bell, X, Search, ChevronRight } from 'lucide-react';
import { fetchQuoteRequests } from '../services/api';
import { StatusPill } from './StatusPill';
import { STATUS_BADGE_META } from '../constants';
import { formatCurrency } from '../utils/currency';
import { renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { UserAvatar } from './UserAvatar';

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
          // Tách giá chất liệu / đá do BE tính sẵn (priceBreakdown) — FE chỉ đọc.
          materialPrice: o.priceBreakdown ? o.priceBreakdown.material : null,
          stonePrice: o.priceBreakdown ? o.priceBreakdown.stone : null,
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
    <header className="titlebar relative bg-surface border-b border-border h-[64px] py-0 px-[24px] box-border flex items-center justify-end">

      {/* Search tổng — chỉ hiện ở Tổng Quan, canh giữa header. Gộp 2 mục: Yêu Cầu (mã đơn/tên
          khách hàng) và Sản Phẩm (danh mục/chất liệu đã báo giá) từ cùng 1 kết quả search. */}
      {showSearch && (
        <div ref={searchWrapRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px]">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-[12px] text-faint pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) openDropdownAtCurrentPosition(); }}
              placeholder="Tìm yêu cầu, sản phẩm, khách hàng..."
              className="w-full pt-[9px] pr-[12px] pb-[9px] pl-[34px] rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] text-[12.5px] text-[#0f172a] outline-none box-border"
            />
          </div>

          {searchOpen && searchQuery.trim() && dropdownPos && createPortal(
            <div
              ref={dropdownContentRef}
              className="fixed -translate-x-1/2 w-[420px] bg-surface border border-border rounded-[12px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.05)] max-h-[440px] overflow-y-auto z-[3000] p-[6px]"
              // động — giữ inline
              style={{
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
              }}
            >
              {searching && (
                <div className="p-[14px] text-center text-[12px] text-faint">Đang tìm...</div>
              )}

              {!searching && requestSection.length === 0 && productSection.length === 0 && (
                <div className="p-[14px] text-center text-[12px] text-faint">Không tìm thấy kết quả</div>
              )}

              {!searching && requestSection.length > 0 && (
                <div className="mb-[4px]">
                  <div className="pt-[8px] px-[10px] pb-[4px] text-[10.5px] font-extrabold text-faint uppercase tracking-[0.4px]">
                    Yêu Cầu
                  </div>
                  {requestSection.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(r.id)}
                      className="dropdown-item-hover w-full flex items-center justify-between gap-[10px] py-[10px] px-[12px] rounded-[8px] border-0 bg-transparent cursor-pointer text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-extrabold text-[#0f172a]">{r.code}</div>
                        <div className="text-[11.5px] text-muted whitespace-nowrap overflow-hidden text-ellipsis">
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
                    className="dropdown-item-hover w-full flex items-center justify-center gap-[4px] py-[8px] px-[12px] rounded-[8px] border-0 bg-transparent text-[#b45309] text-[11.5px] font-bold cursor-pointer"
                  >
                    Xem thêm yêu cầu <ChevronRight size={13} />
                  </button>
                </div>
              )}

              {!searching && productSection.length > 0 && (
                <div>
                  <div
                    className={clsx(
                      'px-[10px] pb-[4px] text-[10.5px] font-extrabold text-faint uppercase tracking-[0.4px]',
                      requestSection.length > 0 ? 'border-t border-[#f1f5f9] mt-[4px] pt-[10px]' : 'border-t-0 mt-0 pt-[8px]',
                    )}
                  >
                    Sản Phẩm
                  </div>
                  {productSection.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectProductResult(p.productName)}
                      className="dropdown-item-hover w-full flex items-center justify-between gap-[10px] py-[10px] px-[12px] rounded-[8px] border-0 bg-transparent cursor-pointer text-left"
                    >
                      <div className="min-w-0 text-[12.5px] font-bold text-[#0f172a] whitespace-nowrap overflow-hidden text-ellipsis">
                        {p.productName}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className="text-[11.5px] font-extrabold text-[#b45309]">
                          {formatCurrency(p.price)}
                        </div>
                        {p.materialPrice != null && renderPriceBreakdownLines({ material: p.materialPrice, stone: p.stonePrice ?? 0 })}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleViewMoreProducts}
                    className="dropdown-item-hover w-full flex items-center justify-center gap-[4px] py-[8px] px-[12px] rounded-[8px] border-0 bg-transparent text-[#b45309] text-[11.5px] font-bold cursor-pointer"
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
      <div className="flex items-center gap-[14px]">
        {/* Bell notification button */}
        <button
          type="button"
          className="bg-[#f8fafc] border border-border rounded-full w-[36px] h-[36px] flex items-center justify-center cursor-pointer relative text-[#475569]"
          title="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-[7px] right-[7px] w-[7px] h-[7px] bg-[#ef4444] rounded-full border-[1.5px] border-surface" />
        </button>

        {/* Profile Avatar Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-[9px] bg-transparent border-0 py-[2px] px-[4px] cursor-pointer"
          >
            <div className="text-right leading-[1.2]">
              <span className="text-[13px] font-extrabold text-[#0f172a] block">
                {user.name || 'Nguyen Van A'}
              </span>
              <span className="text-[10.5px] text-muted block">
                {currentRole === 'SALE' ? 'Store Associate' : currentRole === 'ORDER' ? 'Order Specialist' : 'System Admin'}
              </span>
            </div>

            {/* Circular Avatar */}
            <UserAvatar src={user.avatar} name={user.name} size={34} background="#0f172a" />
          </button>

          {/* Popup Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="absolute top-[calc(100%+8px)] right-0 w-[230px] bg-surface border border-border rounded-[12px] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.05)] p-[8px] z-[1000] animate-[fadeIn_0.15s_ease-out]"
            >
              {/* User Summary Header */}
              <div className="p-[10px] bg-[#f8fafc] rounded-[8px] mb-[6px]">
                <div className="font-extrabold text-[13px] text-[#0f172a]">{user.name}</div>
                <div className="text-[11px] text-muted [word-break:break-all]">{user.email}</div>
                <div className="mt-[4px] inline-flex items-center gap-[4px] bg-[#dbeafe] text-[#1e40af] py-[2px] px-[8px] rounded-[12px] text-[10px] font-extrabold">
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
                className="dropdown-item-hover w-full flex items-center gap-[10px] py-[9px] px-[12px] rounded-[8px] border-0 bg-transparent text-[#334155] text-[12.5px] font-semibold cursor-pointer text-left"
              >
                <UserIcon size={15} color="#2563eb" /> Hồ Sơ Cá Nhân
              </button>

              <div className="h-[1px] bg-[#f1f5f9] my-[4px]" />

              {/* Menu Item: Logout */}
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-[10px] py-[9px] px-[12px] rounded-[8px] border-0 bg-[#fef2f2] text-[#dc2626] text-[12.5px] font-bold cursor-pointer text-left"
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
          <div className="modal-card max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="m-0 text-[16px] font-extrabold flex items-center gap-[8px]">
                <UserIcon size={18} color="#2563eb" /> Thông Tin Tài Khoản
              </h3>
              <button className="icon-btn" onClick={() => setShowProfileModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body flex flex-col gap-[12px] text-[13px]">
              <div className="text-center py-[14px] px-0">
                <UserAvatar
                  src={user.avatar}
                  name={user.name}
                  size={56}
                  background="linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)"
                  className="mx-auto mb-[8px]"
                />
                <strong className="text-[16px] text-[#0f172a]">{user.name}</strong>
                <p className="mt-[2px] mr-0 mb-0 ml-0 text-muted text-[12px]">{user.email}</p>
              </div>

              <div className="bg-[#f8fafc] border border-border rounded-[10px] p-[12px] flex flex-col gap-[8px]">
                <div className="flex justify-between">
                  <span className="text-muted">Mã tài khoản:</span>
                  <span className="font-bold font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Vai trò (Role):</span>
                  <span className="font-extrabold text-[#0f172a]">{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Phòng ban:</span>
                  <span className="font-bold">{user.department?.name || '---'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer justify-end">
              <button className="btn-insp btn-insp-primary w-auto py-[8px] px-[20px]" onClick={() => setShowProfileModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
