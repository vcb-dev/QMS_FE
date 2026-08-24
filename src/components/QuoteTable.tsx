import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { QuoteRequest, Role, User } from '../types';
import { Edit, Inbox, DollarSign, Lock, CheckCircle, XCircle, FilePlus, Clock, RotateCcw, ChevronDown, Award, HelpCircle, Trash2, X, Layers } from 'lucide-react';
import { formatCurrency, formatDuration as formatDurationMs } from '../utils/currency';
import { STATUS_BADGE_META } from '../constants';

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
  onResubmit?: (id: string) => void;
  onConfirmDirectPrice?: (id: string, price: number) => void;
  onDelete?: (id: string) => void;
  onMarkClosed?: (id: string) => void;
  onManageOptions?: (id: string) => void;
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
  onResubmit,
  onConfirmDirectPrice,
  onDelete,
  onMarkClosed,
  onManageOptions,
}) => {
  // Ảnh sản phẩm đang bấm xem zoom — null = không mở lightbox
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  // Mức zoom trong lightbox — lăn chuột để tăng/giảm, 1 = vừa khung
  const [zoomScale, setZoomScale] = useState(1);
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.2;

  // Kéo ảnh để xem chỗ khác khi đang zoom — kéo chuột trên ảnh, cuộn khung chứa theo
  const lightboxScrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = lightboxScrollRef.current;
      const drag = dragStateRef.current;
      if (!el || !drag) return;
      el.scrollLeft = drag.scrollLeft - (e.clientX - drag.startX);
      el.scrollTop = drag.scrollTop - (e.clientY - drag.startY);
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Chỉ Order cần cột thiết yếu (mã, tên, ảnh, chất liệu, loại sản phẩm, thời gian,
  // trạng thái, số đo, bộ phận, giá, VAT) — Sale và Admin xem đủ cột như cũ, thứ tự cột giữ nguyên.
  const isCompactView = currentRole === 'ORDER';

  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomScale <= ZOOM_MIN) return;
    const el = lightboxScrollRef.current;
    if (!el) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setIsDragging(true);
  };

  // Mốc thời gian xử lý (nhận xử lý / báo giá / trả lại) — dựa trên acceptedAt/returnedAt
  // Dưới 1 phút hiện giây, dưới 1 giờ hiện phút, dưới 1 ngày hiện giờ, từ 1 ngày trở lên hiện ngày tròn
  // Trả về null nếu mốc sau đứng trước mốc trước (data lỗi) — không che giấu bằng cách làm tròn về 1
  const formatDuration = (fromMs: number, toMs: number): string | null => {
    if (toMs < fromMs) return null;
    return formatDurationMs(toMs - fromMs);
  };

  const renderProcessingTimeCell = (r: QuoteRequest) => {
    if (!r.acceptedAt) {
      return <span style={{ color: '#94a3b8', fontSize: '11px' }}>Chưa tiếp nhận</span>;
    }

    const acceptedTime = new Date(r.acceptedAt).getTime();
    const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : acceptedTime;
    const toAccept = formatDuration(createdTime, acceptedTime);

    let secondLine: React.ReactNode = null;
    if (r.status === 'REJECTED' && r.updatedAt) {
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
    PENDING:       { ...STATUS_BADGE_META.PENDING,        icon: <FilePlus size={13} /> },
    PROCESSING:    { ...STATUS_BADGE_META.PROCESSING,     icon: <Clock size={13} /> },
    QUOTED:        { ...STATUS_BADGE_META.QUOTED,         icon: <CheckCircle size={13} /> },
    REJECTED:      { ...STATUS_BADGE_META.REJECTED,       icon: <XCircle size={13} /> },
    NEED_MORE_INFO:{ ...STATUS_BADGE_META.NEED_MORE_INFO, icon: <RotateCcw size={13} /> },
    CLOSED:        { ...STATUS_BADGE_META.CLOSED,         icon: <Award size={13} /> },
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
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            minWidth: '118px', padding: '4px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700,
            cursor: 'pointer', border: `1px solid ${meta.border}`,
            background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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

  // Chất liệu nhiều hơn 1: chỉ hiện cái đầu + "...", bấm vào xổ dọc xuống dưới (không tràn ngang)
  const MaterialsCell: React.FC<{ materials: string[] }> = ({ materials }) => {
    const [expanded, setExpanded] = useState(false);
    const chipStyle: React.CSSProperties = { background: '#f1f5f9', color: '#334155', padding: '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'inline-block' };

    if (materials.length === 0) {
      return <span style={chipStyle}>---</span>;
    }

    if (materials.length === 1) {
      return <span style={chipStyle}>{materials[0]}</span>;
    }

    if (!expanded) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          title="Bấm để xem tất cả chất liệu"
        >
          <span style={chipStyle}>{materials[0]}</span>
          <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '13px' }}>...</span>
        </button>
      );
    }

    return (
      <div
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        style={{ display: 'flex', flexDirection: 'column', gap: '3px', cursor: 'pointer' }}
        title="Bấm để thu gọn"
      >
        {materials.map((m, idx) => (
          <span key={idx} style={chipStyle}>{m}</span>
        ))}
      </div>
    );
  };

  const renderStatusCell = (r: QuoteRequest, isMyReq: boolean) => {
    if (currentRole === 'SALE') {
      if (isMyReq && r.status === 'PENDING') {
        return (
          <StatusDropdown
            current="PENDING"
            options={[
              { value: 'EDIT', label: 'Sửa yêu cầu', icon: <Edit size={13} />, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            ]}
            onChange={(val) => {
              if (val === 'EDIT') onEdit(r);
            }}
          />
        );
      }

      if (isMyReq && r.status === 'NEED_MORE_INFO') {
        return (
          <StatusDropdown
            current="NEED_MORE_INFO"
            options={[
              { value: 'EDIT', label: 'Sửa / Bổ sung', icon: <Edit size={13} />, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
              ...(onResubmit
                ? [{ value: 'RESUBMIT', label: 'Gửi lại (không sửa gì)', icon: <RotateCcw size={13} />, color: '#b45309', bg: '#fffbeb', border: '#fde68a' }]
                : []),
            ]}
            onChange={(val) => {
              if (val === 'EDIT') onEdit(r);
              else if (val === 'RESUBMIT' && onResubmit) onResubmit(r.id);
            }}
          />
        );
      }

      if (isMyReq && r.status === 'QUOTED' && onMarkClosed) {
        return (
          <StatusDropdown
            current="QUOTED"
            options={[
              { value: 'CLOSED', label: 'Đánh Dấu Đã Chốt', icon: <Award size={13} />, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
            ]}
            onChange={(val) => {
              if (val === 'CLOSED') onMarkClosed(r.id);
            }}
          />
        );
      }

      switch (r.status) {
        case 'PENDING':
          return (
            <span className="status-pill new">
              <FilePlus size={13} color="#1d4ed8" /> Yêu cầu mới
            </span>
          );
        case 'PROCESSING':
          return (
            <span className="status-pill process">
              <Clock size={13} color="#b45309" /> Đang xử lý
            </span>
          );
        case 'QUOTED':
          return (
            <span className="status-pill done">
              <CheckCircle size={13} color="#15803d" /> Đã báo giá
            </span>
          );
        case 'REJECTED':
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
        case 'CLOSED':
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
    const quotedPriceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
    // Sale đã tự ước tính giá lúc tạo yêu cầu (qua Calculator) — cho phép ORDER/ADMIN chốt nhanh
    // đúng giá đó thành báo giá chính thức, khỏi phải mở lại form Báo Giá đầy đủ.
    const confirmDirectOption = onConfirmDirectPrice && quotedPriceVal > 0
      ? [{ value: 'CONFIRM_DIRECT', label: 'Xác nhận giá tạm tính (nhanh)', icon: <CheckCircle size={13} />, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' }]
      : [];

    if (r.status === 'PENDING') {
      return (
        <StatusDropdown
          current="PENDING"
          options={[
            { value: 'PENDING',       label: 'Yêu cầu mới',            icon: <FilePlus size={13} />,    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { value: 'PROCESSING',    label: 'Tiếp nhận (Đang xử lý)', icon: <Clock size={13} />,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            ...confirmDirectOption,
          ]}
          onChange={(val) => {
            if (val === 'PROCESSING') onAccept(r.id, r.version);
            else if (val === 'CONFIRM_DIRECT' && onConfirmDirectPrice) onConfirmDirectPrice(r.id, quotedPriceVal);
          }}
        />
      );
    }

    if (r.status === 'PROCESSING') {
      const isAssignedToCurrentPricing =
        r.assignee?.id === currentUser.id || r.assignee?.email === currentUser.email;

      if (currentRole === 'ORDER' && !isAssignedToCurrentPricing) {
        return (
          <span className="status-pill process" title="Yêu cầu đang do nhân sự Order khác xử lý">
            <Clock size={13} color="#b45309" /> Đang xử lý
          </span>
        );
      }

      return (
        <StatusDropdown
          current="PROCESSING"
          options={[
            { value: 'PROCESSING',    label: 'Đang xử lý',             icon: <Clock size={13} />,       color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { value: 'QUOTED',        label: 'Chốt giá (Đã báo giá)',   icon: <CheckCircle size={13} />, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
            ...confirmDirectOption,
            { value: 'NEED_MORE_INFO',label: 'Trả lại Sale (Cần bổ sung)', icon: <RotateCcw size={13} />, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
            { value: 'REJECTED',      label: 'Từ chối hẳn',             icon: <XCircle size={13} />,    color: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
          ]}
          onChange={(val) => {
            if (val === 'QUOTED') onPricing(r.id);
            else if (val === 'CONFIRM_DIRECT' && onConfirmDirectPrice) onConfirmDirectPrice(r.id, quotedPriceVal);
            else if (val === 'NEED_MORE_INFO' && onReturn) onReturn(r.id);
            else if (val === 'REJECTED') onReject(r.id);
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

    if (r.status === 'QUOTED') {
      return (
        <span className="status-pill done" title="Trạng thái hoàn tất">
          <CheckCircle size={13} color="#15803d" /> Đã báo giá
        </span>
      );
    }

    if (r.status === 'CLOSED') {
      return (
        <span className="status-pill closed" style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }} title="Khách đã chốt mua">
          <Award size={13} color="#6d28d9" /> Đã chốt
        </span>
      );
    }

    if (r.status === 'REJECTED') {
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
            {!isCompactView && <th>Khách Hàng / Hỏi Giá</th>}
            <th>Danh Mục</th>
            <th>Ảnh</th>
            <th>Tên Sản Phẩm</th>
            <th>Chất Liệu</th>
            <th style={{ color: '#3730a3' }}>VAT</th>
            <th style={{ color: '#0f766e' }}>Báo Giá Khách (Có VAT)</th>
            <th>Số Đo Kích Thước</th>
            {!isCompactView && <th>Tỷ Lệ Chốt</th>}
            {!isCompactView && <th>Yêu Cầu / Muốn Nhận</th>}
            {!isCompactView && <th>Người Báo Giá</th>}
            {!isCompactView && (
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
            )}
            <th>Bộ Phận</th>
            <th style={{ textAlign: 'center' }}>Thao Tác</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const isSelected = r.id === selectedId || r.code === selectedId;
            const isRejected = r.status === 'REJECTED';
            const isMyReq =
              currentRole === 'ORDER'
                ? r.assignee?.id === currentUser.id || r.assignee?.email === currentUser.email
                : r.createdBy?.id === currentUser.id ||
                  r.requester?.id === currentUser.id ||
                  r.requester?.email === currentUser.email;

            const materialsList = r.materials && r.materials.length > 0
              ? r.materials.map((m) => m.name)
              : r.material ? [r.material.name] : ['---'];

            const priceVal = r.quotedPrice ? Number(r.quotedPrice) : 0;
            const pricedOptionsCount = (r.options || []).filter((o) => o.quotedPrice != null).length;

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
                <td>{renderStatusCell(r, isMyReq)}</td>
                {!isCompactView && (
                  <td>
                    <strong style={{ color: '#0f172a' }}>{displayCustomerName}</strong>
                  </td>
                )}
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {r.category?.name || '---'}
                  </span>
                </td>
                <td>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={r.images && r.images.length > 0 ? r.images[0].imageUrl : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36'}
                      className="thumb-img"
                      alt="SP"
                      style={{ cursor: 'zoom-in' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(1);
                        setZoomedImage(r.images && r.images.length > 0 ? r.images[0].imageUrl : 'https://images.unsplash.com/photo-1524758631624-e2822e304c36');
                      }}
                    />
                    {r.images && r.images.length > 1 && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontSize: '9.5px',
                          fontWeight: 800,
                          padding: '1px 4px',
                          borderRadius: '4px',
                          border: '1px solid #ffffff',
                          pointerEvents: 'none',
                        }}
                      >
                        +{r.images.length - 1}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {(() => {
                    const activeOpt =
                      r.options?.find((o) => o.selectionStatus === 'CLOSED') ||
                      r.options?.find((o) => o.selectionStatus === 'SELECTED') ||
                      r.options?.[0];

                    const weightVal = activeOpt?.weightChi ?? (r as any).weightChi;
                    const weightDisplay = weightVal != null && Number(weightVal) > 0 ? `${weightVal} chỉ` : null;

                    let stoneDisplay = '';
                    if (activeOpt?.stones && activeOpt.stones.length > 0) {
                      stoneDisplay = activeOpt.stones.map((s) => `${s.quantity}v ${s.stoneName || s.stone?.name || 'đá'}`).join(', ');
                    } else if (activeOpt?.stoneDescription) {
                      stoneDisplay = activeOpt.stoneDescription;
                    }

                    return (
                      <div>
                        <div title={r.productName} style={{ fontWeight: 700, color: '#0f172a', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.productName}
                        </div>
                        {(weightDisplay || stoneDisplay) && (
                          <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {weightDisplay && (
                              <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                {weightDisplay}
                              </span>
                            )}
                            {stoneDisplay && (
                              <span style={{ background: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stoneDisplay}>
                                {stoneDisplay}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td>
                  <MaterialsCell materials={materialsList} />
                </td>
                <td style={{ color: '#4338ca', fontWeight: 700, textAlign: 'center' }}>
                  {currentRole === 'SALE'
                    ? (r.vat == null ? '---' : r.vat === 0 ? 'Không VAT' : 'Có VAT')
                    : (r.vat != null ? `${r.vat}%` : '---')}
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
                  (r.status === 'QUOTED' || r.status === 'CLOSED') ? (
                    <td style={{ color: '#0f766e', borderRadius: '6px', padding: '6px 8px', fontWeight: 800, fontSize: '13px' }}>
                      {formattedPrice}
                    </td>
                  ) : (
                    <td
                      title="Giá tạm tính — Chưa được Admin/Order xác nhận, không được báo cho khách"
                      style={{
                        borderRadius: '6px',
                        padding: '6px 8px',
                      }}
                    >
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 700, fontSize: '12.5px', opacity: 0.75 }}>
                          {formattedPrice}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            color: '#ea580c',
                            background: '#fff7ed',
                            border: '1px solid #ffedd5',
                            padding: '0 4px',
                            borderRadius: '3px',
                            fontWeight: 800,
                            marginTop: '2px',
                            lineHeight: '14px',
                          }}
                        >
                          Chưa duyệt
                        </span>
                      </div>
                    </td>
                  )
                ) : (
                  <td style={{ color: '#94a3b8', textAlign: 'center' }}>---</td>
                )}
                <td style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{r.customerMeasurements || '---'}</td>
                {!isCompactView && (
                  <td style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                    {r.closeRatePct !== undefined && r.closeRatePct !== null ? `${r.closeRatePct}%` : '---'}
                  </td>
                )}
                {!isCompactView && (
                  <td style={{ fontSize: '11px', color: '#d97706', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                    {displayNote}
                  </td>
                )}
                {!isCompactView && (
                  <td><strong style={{ color: '#334155' }}>{r.assignee?.name || 'Chưa phân công'}</strong></td>
                )}
                {!isCompactView && <td>{renderProcessingTimeCell(r)}</td>}
                <td>
                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                    {displayDeptName}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {/* SALE Role Permissions — thao tác đổi trạng thái/sửa đã dồn vào dropdown ở cột Trạng Thái */}
                  {currentRole === 'SALE' && (
                    <>
                      {r.status === 'PENDING' ? (
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
                    <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {r.status === 'PENDING' ? (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAccept(r.id, r.version);
                          }}
                        >
                          <Inbox size={12} /> Tiếp nhận
                        </button>
                      ) : r.status === 'PROCESSING' ? (
                        <>
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
                          {onManageOptions && pricedOptionsCount > 1 && (
                            <button
                              className="tool-btn"
                              title="Xóa bớt phương án giá nháp không cần dùng"
                              style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                              onClick={(e) => { e.stopPropagation(); onManageOptions(r.id); }}
                            >
                              <Layers size={12} /> Quản Lý PA ({pricedOptionsCount})
                            </button>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Đã khóa
                        </span>
                      )}
                    </div>
                  )}

                  {/* ADMIN — toàn quyền: luôn có Sửa + Xóa bất kể trạng thái, cộng thêm thao tác nghiệp vụ theo trạng thái hiện tại */}
                  {currentRole === 'ADMIN' && (
                    <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {r.status === 'PENDING' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => { e.stopPropagation(); onAccept(r.id, r.version); }}
                        >
                          <Inbox size={12} /> Tiếp nhận
                        </button>
                      )}
                      {r.status === 'PROCESSING' && (
                        <button
                          className="tool-btn"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}
                          onClick={(e) => { e.stopPropagation(); onPricing(r.id); }}
                        >
                          <DollarSign size={12} /> Báo Giá
                        </button>
                      )}
                      {r.status === 'PROCESSING' && onManageOptions && pricedOptionsCount > 1 && (
                        <button
                          className="tool-btn"
                          title="Xóa bớt phương án giá nháp không cần dùng"
                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, background: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                          onClick={(e) => { e.stopPropagation(); onManageOptions(r.id); }}
                        >
                          <Layers size={12} /> Quản Lý PA ({pricedOptionsCount})
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

      {zoomedImage && createPortal(
        <div
          ref={lightboxScrollRef}
          onClick={() => { setZoomedImage(null); setZoomScale(1); }}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setZoomScale((s) => {
              const next = s + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
              return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));
            });
          }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px', cursor: zoomScale > ZOOM_MIN ? (isDragging ? 'grabbing' : 'grab') : 'zoom-out',
            overflow: 'auto',
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => { setZoomedImage(null); setZoomScale(1); }}
            style={{
              position: 'fixed', top: '20px', right: '24px',
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', cursor: 'pointer', zIndex: 1,
            }}
            title="Đóng"
          >
            <X size={20} />
          </button>
          <span style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>
            Lăn chuột để phóng to / thu nhỏ · Kéo ảnh để xem chỗ khác · {Math.round(zoomScale * 100)}%
          </span>
          <img
            src={zoomedImage}
            alt="Xem phóng to"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleImageMouseDown}
            style={{
              width: `${70 * zoomScale}vw`,
              maxWidth: 'none',
              height: 'auto',
              flexShrink: 0,
              objectFit: 'contain',
              borderRadius: '10px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              cursor: zoomScale > ZOOM_MIN ? (isDragging ? 'grabbing' : 'grab') : 'default',
              margin: 'auto',
              transition: isDragging ? 'none' : 'width 0.05s linear',
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
};
