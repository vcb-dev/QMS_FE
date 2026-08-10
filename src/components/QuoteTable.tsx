import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Zap, DollarSign, Lock, CheckCircle, XCircle, FilePlus, Clock, RotateCcw, ChevronDown } from 'lucide-react';

interface QuoteTableProps {
  requests: QuoteRequest[];
  selectedId: string | null;
  currentRole: Role;
  currentUser: User;
  onSelect: (id: string) => void;
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
}

export const QuoteTable: React.FC<QuoteTableProps> = ({
  requests,
  selectedId,
  currentRole,
  currentUser,
  onSelect,
  onEdit,
  onAccept,
  onPricing,
  onReject,
  onReturn,
}) => {
  // Calculate elapsed days without icons
  const renderQuotedDateCell = (r: QuoteRequest) => {
    if (!r.createdAt) return <span style={{ color: '#94a3b8' }}>---</span>;

    const createdTime = new Date(r.createdAt).getTime();

    // Completed / Quoted
    if (r.quotedDate) {
      const quotedTime = new Date(r.quotedDate).getTime();
      const diffMs = quotedTime - createdTime;
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      if (diffDays === 0) {
        return (
          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '11.5px' }} title={`Báo giá ngày ${new Date(r.quotedDate).toLocaleDateString('vi-VN')}`}>
            Trong ngày ({diffHours}h)
          </span>
        );
      }
      return (
        <span style={{ color: '#0f766e', fontWeight: 700, fontSize: '11.5px' }} title={`Báo giá ngày ${new Date(r.quotedDate).toLocaleDateString('vi-VN')}`}>
          {diffDays} ngày sau
        </span>
      );
    }

    // Rejected - calculate days until rejection (updatedAt) or now
    if (r.status === 'TU_CHOI') {
      const rejectTime = r.updatedAt ? new Date(r.updatedAt).getTime() : Date.now();
      const diffMs = rejectTime - createdTime;
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));

      if (diffDays === 0) {
        return (
          <span style={{ color: '#be123c', fontWeight: 700, fontSize: '11.5px' }}>
            Từ chối trong ngày ({diffHours}h)
          </span>
        );
      }
      return (
        <span style={{ color: '#be123c', fontWeight: 700, fontSize: '11.5px' }}>
          Từ chối sau {diffDays} ngày
        </span>
      );
    }

    // Still pending (YC_MOI or DANG_XLY)
    const nowMs = Date.now();
    const elapsedDays = Math.max(0, Math.floor((nowMs - createdTime) / (1000 * 60 * 60 * 24)));
    const elapsedHours = Math.max(0, Math.floor((nowMs - createdTime) / (1000 * 60 * 60)));

    if (elapsedDays === 0) {
      return <span style={{ color: '#2563eb', fontWeight: 600, fontSize: '11.5px' }}>Đã chờ {elapsedHours}h</span>;
    }

    return (
      <span style={{ color: '#d97706', fontWeight: 700, fontSize: '11.5px' }}>
        Đã chờ {elapsedDays} ngày
      </span>
    );
  };

  // ── Custom Status Dropdown (shows icon on trigger) ──
  type StatusOption = {
    value: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
  };

  const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    YC_MOI:        { label: 'Yêu cầu mới',  icon: <FilePlus size={13} />,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    DANG_XLY:      { label: 'Đang xử lý',   icon: <Clock size={13} />,     color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    XONG:          { label: 'Đã báo giá',   icon: <CheckCircle size={13} />,color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    TU_CHOI:       { label: 'Từ chối',       icon: <XCircle size={13} />,   color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
    NEED_MORE_INFO:{ label: 'Cần bổ sung',  icon: <RotateCcw size={13} />, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
  };

  const StatusDropdown: React.FC<{
    current: string;
    options: StatusOption[];
    onChange: (val: string) => void;
  }> = ({ current, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const meta = STATUS_META[current] || { label: current, icon: null, color: '#334155', bg: '#f8fafc', border: '#e2e8f0' };

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    };

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      window.addEventListener('resize', updateMenuPosition);
      document.addEventListener('scroll', updateMenuPosition, true);
      return () => {
        document.removeEventListener('mousedown', handler);
        window.removeEventListener('resize', updateMenuPosition);
        document.removeEventListener('scroll', updateMenuPosition, true);
      };
    }, [open]);

    return (
      <div ref={ref} style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!open) updateMenuPosition();
            setOpen(!open);
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '3px 8px 3px 7px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', border: `1px solid ${meta.border}`,
            background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
            transition: 'all 0.12s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', color: meta.color }}>{meta.icon}</span>
          {meta.label}
          <ChevronDown size={11} style={{ marginLeft: '1px', opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* Dropdown Panel */}
        {open && createPortal(
          <div ref={menuRef} style={{
            position: 'fixed', top: menuPosition.top, left: menuPosition.left, zIndex: 9999,
            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)', padding: '4px', minWidth: '180px',
          }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '7px 10px', border: 'none', borderRadius: '7px',
                  background: opt.value === current ? opt.bg : 'transparent',
                  color: opt.color, fontSize: '12.5px', fontWeight: opt.value === current ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ color: opt.color }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
    );
  };

  const renderStatusCell = (r: QuoteRequest) => {
    if (currentRole === 'SALE') {
      switch (r.status) {
        case 'YC_MOI':
          return (
            <span className="status-pill new">
              <FilePlus size={13} color="#1d4ed8" /> Yêu cầu mới
            </span>
          );
        case 'DANG_XLY':
          return (
            <span className="status-pill process">
              <Clock size={13} color="#b45309" /> Đang xử lý
            </span>
          );
        case 'XONG':
          return (
            <span className="status-pill done">
              <CheckCircle size={13} color="#15803d" /> Đã báo giá
            </span>
          );
        case 'TU_CHOI':
          return (
            <span className="status-pill reject">
              <XCircle size={13} color="#be123c" /> Từ chối
            </span>
          );
        case 'NEED_MORE_INFO':
          return (
            <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}>
              <RotateCcw size={13} color="#ea580c" /> Cần bổ sung
            </span>
          );
        default:
          return <span className="status-pill new">{r.status}</span>;
      }
    }

    // PRICING / ADMIN Role: Custom Icon Dropdown
    if (r.status === 'YC_MOI') {
      return (
        <StatusDropdown
          current="YC_MOI"
          options={[
            { value: 'YC_MOI',        label: 'Yêu cầu mới',          icon: <FilePlus size={13} />,  color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { value: 'DANG_XLY',      label: 'Tiếp nhận (Đang xử lý)', icon: <Clock size={13} />,    color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          ]}
          onChange={(val) => {
            if (val === 'DANG_XLY') onAccept(r.id, r.version);
          }}
        />
      );
    }

    if (r.status === 'DANG_XLY') {
      const isAssignedToCurrentPricing =
        r.pricer?.id === currentUser.id || r.pricer?.email === currentUser.email;

      if (currentRole === 'PRICING' && !isAssignedToCurrentPricing) {
        return (
          <span className="status-pill process" title="Yêu cầu đang do nhân sự Pricing khác xử lý">
            <Clock size={13} color="#b45309" /> Đang xử lý
          </span>
        );
      }

      return (
        <StatusDropdown
          current="DANG_XLY"
          options={[
            { value: 'DANG_XLY',      label: 'Đang xử lý',             icon: <Clock size={13} />,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { value: 'XONG',          label: 'Chốt giá (Đã báo giá)',   icon: <CheckCircle size={13} />, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            { value: 'NEED_MORE_INFO',label: 'Trả lại Sale (Cần bổ sung)', icon: <RotateCcw size={13} />, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
            { value: 'TU_CHOI',       label: 'Từ chối hẳn',             icon: <XCircle size={13} />,    color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
          ]}
          onChange={(val) => {
            if (val === 'XONG') onPricing(r.id);
            else if (val === 'NEED_MORE_INFO' && onReturn) onReturn(r.id);
            else if (val === 'TU_CHOI') onReject(r.id);
          }}
        />
      );
    }

    if (r.status === 'NEED_MORE_INFO') {
      return (
        <span className="status-pill process" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' }}>
          <RotateCcw size={13} color="#ea580c" /> Cần bổ sung
        </span>
      );
    }

    if (r.status === 'XONG') {
      return (
        <span className="status-pill done" title="Trạng thái hoàn tất">
          <CheckCircle size={13} color="#15803d" /> Đã báo giá
        </span>
      );
    }

    if (r.status === 'TU_CHOI') {
      return (
        <span className="status-pill reject" title="Trạng thái từ chối">
          <XCircle size={13} color="#be123c" /> Từ chối hẳn
        </span>
      );
    }

    return <span className="status-pill new">{r.status}</span>;
  };

  return (
    <div className="table-scroll-wrapper">
      <table className="quote-table">
        <thead>
          <tr>
            <th>Mã Hỏi Giá</th>
            <th>Thời Gian Tạo</th>
            <th>Trạng Thái</th>
            <th>Khách Hàng / Hỏi Giá</th>
            <th>Bộ Phận</th>
            <th>Ảnh SP</th>
            <th>Yêu Cầu / Muốn Nhận</th>
            <th>Tên Sản Phẩm + Yêu Cầu</th>
            <th>Chất Liệu</th>
            <th>Danh Mục</th>
            <th>Số Đo Kích Thước</th>
            <th>Tỷ Lệ Chốt</th>
            <th style={{ background: '#e0e7ff', color: '#3730a3' }}>VAT (%)</th>
            <th style={{ background: '#ccfbf1', color: '#0f766e' }}>Báo Giá Khách (Có VAT)</th>
            <th>Người Báo Giá</th>
            <th style={{ textAlign: 'center' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isSelected = r.id === selectedId || r.code === selectedId;
            const isRejected = r.status === 'TU_CHOI';
            const isMyReq =
              currentRole === 'PRICING'
                ? r.pricer?.id === currentUser.id || r.pricer?.email === currentUser.email
                : r.createdBy?.id === currentUser.id ||
                  r.requester?.id === currentUser.id ||
                  r.requester?.email === currentUser.email;

            const materialsList = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name)
              : r.material ? [r.material.name] : ['---'];

            const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;

            const formattedPrice = priceVal > 0 ? priceVal.toLocaleString('en-US') + ' ₫' : 'Chưa có';

            const displayCustomerName = r.customer?.name || r.requester?.name || '---';
            const displayDeptName = r.requester?.department?.name || '---';
            const displayNote = r.desiredLeadTime || '---';

            return (
              <tr
                key={r.id}
                className={isSelected ? 'selected' : ''}
                onClick={() => onSelect(r.id)}
              >
                <td><strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1e293b' }}>{r.code || r.id}</strong></td>
                <td style={{ color: '#64748b', fontSize: '11px' }}>
                  {r.createdAt ? new Date(r.createdAt).toISOString().replace('T', ' ').substring(0, 16) : '---'}
                </td>
                <td>{renderStatusCell(r)}</td>
                <td>
                  <strong style={{ color: '#0f172a' }}>{displayCustomerName}</strong>
                  
                </td>
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {displayDeptName}
                  </span>
                </td>
                <td>
                  <img
                    src={r.images && r.images.length > 0 ? r.images[0].imageUrl : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36'}
                    className="thumb-img"
                    alt="SP"
                  />
                </td>
                <td style={{ fontSize: '11px', color: '#d97706', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                  {displayNote}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.productName}
                  </div>
                </td>
                <td>
                  {materialsList.map((m, idx) => (
                    <span key={idx} style={{ background: '#f1f5f9', color: '#334155', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, marginRight: '4px', display: 'inline-block', marginBottom: '2px' }}>
                      {m}
                    </span>
                  ))}
                </td>
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {r.category?.name || '---'}
                  </span>
                </td>
                <td style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{r.customerMeasurements || '---'}</td>
                <td style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  {r.closeRatePct !== undefined && r.closeRatePct !== null ? `${r.closeRatePct}%` : '---'}
                </td>
                <td style={{ background: '#f5f3ff', color: '#4338ca', fontWeight: 700, borderRadius: '6px', textAlign: 'center' }}>
                  {r.vat ? `${r.vat}%` : '---'}
                </td>
                {isRejected ? (
                  <td
                    style={{ background: '#fff1f2', fontWeight: 800, color: '#be123c', borderRadius: '6px', padding: '6px 8px' }}
                    title={r.rejectReason ? `Lý do từ chối: ${r.rejectReason}` : 'Bị từ chối'}
                  >
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span>Bị từ chối</span>
                      {r.rejectReason && (
                        <span style={{ fontSize: '10px', background: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3', padding: '1px 5px', borderRadius: '4px', cursor: 'help' }}>
                          ⓘ Lý do
                        </span>
                      )}
                    </div>
                  </td>
                ) : priceVal > 0 ? (
                  <td style={{ background: '#ccfbf1', color: '#0f766e', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '13px' }}>
                    {formattedPrice}
                  </td>
                ) : (
                  <td style={{ background: '#f8fafc', borderRadius: '6px', padding: '6px 8px', fontWeight: 700, fontSize: '12px' }}>
                    {renderQuotedDateCell(r)}
                  </td>
                )}

                <td><strong style={{ color: '#334155' }}>{r.pricer?.name || 'Chưa phân công'}</strong></td>
                <td style={{ textAlign: 'center' }}>
                  {/* SALE Role Permissions */}
                  {currentRole === 'SALE' && (
                    <>
                      {(r.status === 'YC_MOI' || r.status === 'NEED_MORE_INFO') && isMyReq ? (
                        <button
                          className="tool-btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: r.status === 'NEED_MORE_INFO' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            color: 'white',
                            boxShadow: '0 3px 8px rgba(234, 88, 12, 0.35)',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(r);
                          }}
                        >
                          <Edit size={12} /> {r.status === 'NEED_MORE_INFO' ? 'Sửa / Bổ Sung' : 'Sửa YC'}
                        </button>
                      ) : r.status === 'YC_MOI' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                          Chờ tiếp nhận
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Đã khóa
                        </span>
                      )}
                    </>
                  )}

                  {/* PRICING Role Permissions */}
                  {(currentRole === 'PRICING' || currentRole === 'ADMIN') && (
                    <>
                      {r.status === 'YC_MOI' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAccept(r.id, r.version);
                          }}
                        >
                          <Zap size={12} /> Tiếp nhận
                        </button>
                      )}

                      {r.status === 'DANG_XLY' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPricing(r.id);
                          }}
                        >
                          <DollarSign size={12} /> Báo Giá
                        </button>
                      )}

                      {r.status === 'XONG' && (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Đã Báo Giá
                        </span>
                      )}

                      {r.status === 'TU_CHOI' && (
                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> Từ Chối
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
