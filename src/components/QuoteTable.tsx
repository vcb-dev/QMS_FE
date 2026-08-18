import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Zap, DollarSign, Lock, CheckCircle, XCircle, FilePlus, Clock, RotateCcw, ChevronDown, Award, HelpCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

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
  onDelete?: (id: string) => void;
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
  onDelete,
}) => {
  // Mốc thời gian xử lý (nhận xử lý / báo giá / trả lại) — dựa trên acceptedAt/returnedAt
  // Dưới 1 phút hiện giây, dưới 1 giờ hiện phút, dưới 1 ngày hiện giờ, từ 1 ngày trở lên hiện ngày tròn
  // Trả về null nếu mốc sau đứng trước mốc trước (data lỗi) — không che giấu bằng cách làm tròn về 1
  const formatDuration = (fromMs: number, toMs: number): string | null => {
    if (toMs < fromMs) return null;
    const seconds = (toMs - fromMs) / 1000;
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))} giây`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${Math.max(1, Math.round(minutes))} phút`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.max(1, Math.round(hours))} giờ`;
    return `${Math.round(hours / 24)} ngày`;
  };

  const renderProcessingTimeCell = (r: QuoteRequest) => {
    if (!r.acceptedAt) {
      return <span style={{ color: '#94a3b8', fontSize: '11px' }}>Chưa tiếp nhận</span>;
    }

    const acceptedTime = new Date(r.acceptedAt).getTime();
    const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : acceptedTime;
    const toAccept = formatDuration(createdTime, acceptedTime);

    let secondLine: React.ReactNode = null;
    if (r.status === 'TU_CHOI' && r.updatedAt) {
      const dur = formatDuration(acceptedTime, new Date(r.updatedAt).getTime());
      if (dur) secondLine = <div style={{ color: '#be123c' }}>Từ chối sau {dur}</div>;
    } else if (r.returnedAt) {
      const dur = formatDuration(acceptedTime, new Date(r.returnedAt).getTime());
      if (dur) secondLine = <div style={{ color: '#c2410c' }}>Trả lại sau {dur}</div>;
    } else if (r.quotedDate) {
      const dur = formatDuration(acceptedTime, new Date(r.quotedDate).getTime());
      if (dur) secondLine = <div style={{ color: '#0f766e' }}>Báo giá sau {dur}</div>;
    }

    return (
      <div style={{ fontSize: '11px', lineHeight: '1.5' }}>
        <div style={{ color: '#475569' }}>{toAccept ? `Nhận xử lý sau ${toAccept}` : '—'}</div>
        {secondLine}
      </div>
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
        case 'DA_CHOT':
          return (
            <span className="status-pill closed" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
              <Award size={13} color="#6d28d9" /> Đã chốt
            </span>
          );
        default:
          return <span className="status-pill new">{r.status}</span>;
      }
    }

    // ORDER / ADMIN Role: Custom Icon Dropdown
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

      if (currentRole === 'ORDER' && !isAssignedToCurrentPricing) {
        return (
          <span className="status-pill process" title="Yêu cầu đang do nhân sự Order khác xử lý">
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

    if (r.status === 'DA_CHOT') {
      return (
        <span className="status-pill closed" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }} title="Khách đã chốt mua">
          <Award size={13} color="#6d28d9" /> Đã chốt
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
            <th style={{ color: '#3730a3' }}>VAT (%)</th>
            <th style={{ color: '#0f766e' }}>Báo Giá Khách (Có VAT)</th>
            <th>Người Báo Giá</th>
            <th>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Mốc Xử Lý
                <span
                  title={
                    'Nhận xử lý sau: từ lúc tạo yêu cầu đến lúc ORDER tiếp nhận.\n' +
                    'Báo giá sau: từ lúc tiếp nhận đến lúc báo giá.\n' +
                    'Trả lại sau: từ lúc tiếp nhận đến lúc trả lại Sale.'
                  }
                  style={{ display: 'inline-flex', cursor: 'help', color: '#94a3b8' }}
                >
                  <HelpCircle size={13} />
                </span>
              </span>
            </th>
            <th style={{ textAlign: 'center' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isSelected = r.id === selectedId || r.code === selectedId;
            const isRejected = r.status === 'TU_CHOI';
            const isMyReq =
              currentRole === 'ORDER'
                ? r.pricer?.id === currentUser.id || r.pricer?.email === currentUser.email
                : r.createdBy?.id === currentUser.id ||
                  r.requester?.id === currentUser.id ||
                  r.requester?.email === currentUser.email;

            const materialsList = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name)
              : r.material ? [r.material.name] : ['---'];

            const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;

            const formattedPrice = priceVal > 0 ? formatCurrency(priceVal) : 'Chưa có';

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
                <td style={{ color: '#4338ca', fontWeight: 700, textAlign: 'center' }}>
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
                  <td style={{color: '#0f766e', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '13px' }}>
                    {formattedPrice}
                  </td>
                ) : (
                  <td style={{ color: '#94a3b8', textAlign: 'center' }}>---</td>
                )}

                <td><strong style={{ color: '#334155' }}>{r.pricer?.name || 'Chưa phân công'}</strong></td>
                <td>{renderProcessingTimeCell(r)}</td>
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

                  {/* ORDER Role Permissions — cùng kiểu tối giản như bên SALE: chỉ nút thao tác được, còn lại "Đã khóa" */}
                  {currentRole === 'ORDER' && (
                    <>
                      {r.status === 'YC_MOI' ? (
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
                      ) : r.status === 'DANG_XLY' ? (
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
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Đã khóa
                        </span>
                      )}
                    </>
                  )}

                  {/* ADMIN — toàn quyền: luôn có Sửa + Xóa bất kể trạng thái, cộng thêm thao tác nghiệp vụ theo trạng thái hiện tại */}
                  {currentRole === 'ADMIN' && (
                    <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {r.status === 'YC_MOI' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => { e.stopPropagation(); onAccept(r.id, r.version); }}
                        >
                          <Zap size={12} /> Tiếp nhận
                        </button>
                      )}
                      {r.status === 'DANG_XLY' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => { e.stopPropagation(); onPricing(r.id); }}
                        >
                          <DollarSign size={12} /> Báo Giá
                        </button>
                      )}
                      <button
                        className="tool-btn"
                        style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px' }}
                        onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                      >
                        <Edit size={12} /> Sửa
                      </button>
                      <button
                        className="tool-btn"
                        style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: '8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Xóa hẳn yêu cầu ${r.code || r.id}? Không thể hoàn tác.`)) onDelete?.(r.id);
                        }}
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
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
