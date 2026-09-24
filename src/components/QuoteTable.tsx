import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { createPortal } from 'react-dom';
import type { QuoteRequest, RequestsPageProps } from '../types';
import { Edit, CheckCircle, XCircle, FilePlus, Clock, RotateCcw, ChevronDown, Award, HelpCircle, X, MessageCircle } from 'lucide-react';
import { formatCurrency, formatDuration } from '../utils/currency';
import { STATUS_BADGE_META, UI_CONSTANTS } from '../constants';
import { getPriceBreakdown, renderPriceBreakdownLines } from '../utils/priceBreakdown';
import { getPrimaryOption } from '../utils/quoteOption';
import {
  statusPillCls,
  statusPillNewCls,
  statusPillProcessCls,
  statusPillDoneCls,
  statusPillRejectCls,
  quoteChipCls,
} from '../styles/classNames';

// Các field dưới trùng nguyên xi kiểu dữ liệu với RequestsPageProps (types/index.ts) — Pick thẳng
// thay vì khai tay lại. 3 field còn lại khai riêng vì lệch với nguồn: onSelect khác tên onSelectReq,
// selectedId/onReturn lệch optional/required so với RequestsPageProps.
type QuoteTableProps = Pick<
  RequestsPageProps,
  | 'requests'
  | 'currentRole'
  | 'currentUser'
  | 'onEdit'
  | 'onAccept'
  | 'onQuoteNow'
  | 'onPricing'
  | 'onReject'
  | 'onResubmit'
  | 'onMarkClosed'
> & {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReturn?: (id: string) => void;
  // Badge tin nhắn chưa đọc + mở chat ngay tại bảng — đơn nào không có key nghĩa là 0.
  unreadCounts: Record<string, number>;
  onOpenChat: (id: string) => void;
};

export const QuoteTable: React.FC<QuoteTableProps> = ({
  requests,
  selectedId,
  currentRole,
  currentUser,
  onSelect,
  onEdit,
  onAccept,
  onQuoteNow,
  onPricing,
  onReject,
  onReturn,
  onResubmit,
  onMarkClosed,
  unreadCounts,
  onOpenChat,
}) => {
  // Độ cao dòng bảng (kiểu Lark) — chỉ đổi padding dọc, nhớ lựa chọn qua reload bằng localStorage
  // (sở thích riêng máy đang xem, không cần đồng bộ server).
  type RowHeight = 'compact' | 'normal' | 'tall';
  const ROW_HEIGHT_OPTIONS: { value: RowHeight; label: string }[] = [
    { value: 'compact', label: 'Thấp' },
    { value: 'normal', label: 'Vừa' },
    { value: 'tall', label: 'Cao' },
  ];
  const ROW_HEIGHT_CLS: Record<RowHeight, string> = {
    compact: '[&_td]:py-[4px] [&_th]:py-[4px]',
    normal: '[&_td]:py-[10px] [&_th]:py-[8px]',
    tall: '[&_td]:py-[18px] [&_th]:py-[10px]',
  };
  const [rowHeight, setRowHeight] = useState<RowHeight>(() => {
    try {
      const saved = localStorage.getItem('quoteTableRowHeight');
      return saved === 'compact' || saved === 'normal' || saved === 'tall' ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('quoteTableRowHeight', rowHeight); } catch { /* private mode — bỏ qua */ }
  }, [rowHeight]);

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


  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomScale <= ZOOM_MIN) return;
    const el = lightboxScrollRef.current;
    if (!el) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setIsDragging(true);
  };



  const renderProcessingTimeCell = (r: QuoteRequest) => {
    if (!r.acceptedAt) {
      return <span className="text-faint text-[14px]">Chưa tiếp nhận</span>;
    }

    const acceptedTime = new Date(r.acceptedAt).getTime();
    const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : acceptedTime;
    const toAccept = formatDuration(createdTime, acceptedTime);

    let secondLine: React.ReactNode = null;
    if (r.status === 'REJECTED' && r.updatedAt) {
      const dur = formatDuration(acceptedTime, new Date(r.updatedAt).getTime());
      if (dur) secondLine = <div className="text-[#be123c]">Từ chối sau {dur}</div>;
    } else if (r.returnedAt) {
      const dur = formatDuration(acceptedTime, new Date(r.returnedAt).getTime());
      if (dur) secondLine = <div className="text-[#c2410c]">Trả lại sau {dur}</div>;
    } else if (r.quotedDate) {
      const dur = formatDuration(acceptedTime, new Date(r.quotedDate).getTime());
      if (dur) secondLine = <div className="text-[#0f766e]">Báo giá sau {dur}</div>;
    }

    return (
      <div className="text-[14px] leading-[1.35]">
        <div className="text-[#475569]">{toAccept ? `Nhận xử lý sau ${toAccept}` : '—'}</div>
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
      <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!open) updateMenuPosition();
            setOpen(!open);
          }}
          className="inline-flex items-center justify-center gap-[4px] min-w-[118px] py-[4px] px-[10px] rounded-[20px] text-[14.5px] font-bold cursor-pointer whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[all_0.12s]"
          // động — giữ inline
          style={{
            border: `1px solid ${meta.border}`,
            background: meta.bg,
            color: meta.color,
          }}
        >
          <span
            className="flex items-center"
            // động — giữ inline
            style={{ color: meta.color }}
          >
            {meta.icon}
          </span>
          {meta.label}
          <ChevronDown
            size={11}
            className={clsx('ml-[1px] opacity-70 transition-[transform_0.15s]', open && 'rotate-180')}
          />
        </button>

        {/* Dropdown Panel */}
        {open && createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-surface border border-border rounded-[10px] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] p-[4px] min-w-[180px]"
            // động — giữ inline
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={clsx(
                  'flex items-center gap-[8px] w-full py-[7px] px-[10px] border-0 rounded-[7px] text-[15.5px] cursor-pointer text-left',
                  opt.value === current ? 'font-bold' : 'font-medium',
                )}
                // động — giữ inline
                style={{
                  background: opt.value === current ? opt.bg : 'transparent',
                  color: opt.color,
                }}
              >
                <span
                  // động — giữ inline
                  style={{ color: opt.color }}
                >
                  {opt.icon}
                </span>
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

    if (materials.length === 0) {
      return <span className={quoteChipCls}>---</span>;
    }

    if (materials.length === 1) {
      return <span className={quoteChipCls}>{materials[0]}</span>;
    }

    if (!expanded) {
      return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="inline-flex items-center gap-[4px] bg-transparent border-0 p-0 cursor-pointer"
          title="Bấm để xem tất cả chất liệu"
        >
          <span className={quoteChipCls}>{materials[0]}</span>
          <span className="text-faint font-extrabold text-[16px]">...</span>
        </button>
      );
    }

    return (
      <div
        onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
        className="flex flex-col gap-[3px] cursor-pointer"
        title="Bấm để thu gọn"
      >
        {materials.map((m, idx) => (
          <span key={idx} className={quoteChipCls}>{m}</span>
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
              { value: 'CLOSED', ...STATUS_META.CLOSED, label: 'Đánh Dấu Đã Chốt' },
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
            <span className={clsx(statusPillCls, statusPillNewCls)}>
              <FilePlus size={13} color="#1d4ed8" /> Yêu cầu mới
            </span>
          );
        case 'PROCESSING':
          return (
            <span className={clsx(statusPillCls, statusPillProcessCls)}>
              <Clock size={13} color="#b45309" /> Đang xử lý
            </span>
          );
        case 'QUOTED':
          return (
            <span className={clsx(statusPillCls, statusPillDoneCls)}>
              <CheckCircle size={13} color="#15803d" /> Đã báo giá
            </span>
          );
        case 'REJECTED':
          return (
            <span className={clsx(statusPillCls, statusPillRejectCls)}>
              <XCircle size={13} color="#be123c" /> Từ chối
            </span>
          );
        case 'NEED_MORE_INFO':
          return (
            <span className={clsx(statusPillCls, 'bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]')}>
              <RotateCcw size={13} color="#ea580c" /> Cần bổ sung
            </span>
          );
        case 'CLOSED':
          return (
            <span className={clsx(statusPillCls, 'bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]')}>
              <Award size={13} color="#6d28d9" /> Đã chốt
            </span>
          );
        default:
          return <span className={clsx(statusPillCls, statusPillNewCls)}>{r.status}</span>;
      }
    }

    // ORDER / ADMIN Role: Custom Icon Dropdown
    if (r.status === 'PENDING') {
      return (
        <StatusDropdown
          current="PENDING"
          options={[
            { value: 'PENDING',       ...STATUS_META.PENDING,    label: 'Yêu cầu mới' },
            { value: 'PROCESSING',    ...STATUS_META.PROCESSING, label: 'Tiếp nhận (Đang xử lý)' },
            { value: 'QUOTE_NOW',     ...STATUS_META.QUOTED,     label: 'Báo giá luôn' },
          ]}
          onChange={(val) => {
            if (val === 'PROCESSING') onAccept(r.id, r.version);
            // Báo giá luôn: tiếp nhận + khóa đơn rồi mở modal nhập giá. Nếu người khác vừa tiếp
            // nhận trước, bước tiếp nhận sẽ báo lỗi và modal không mở (xử lý ở onQuoteNow).
            else if (val === 'QUOTE_NOW') onQuoteNow(r.id, r.version);
          }}
        />
      );
    }

    if (r.status === 'PROCESSING') {
      const isAssignedToCurrentPricing =
        r.assignee?.id === currentUser.id || r.assignee?.email === currentUser.email;

      if (currentRole === 'ORDER' && !isAssignedToCurrentPricing) {
        return (
          <span className={clsx(statusPillCls, statusPillProcessCls)} title="Yêu cầu đang do nhân sự Order khác xử lý">
            <Clock size={13} color="#b45309" /> Đang xử lý
          </span>
        );
      }

      return (
        <StatusDropdown
          current="PROCESSING"
          options={[
            { value: 'PROCESSING',    ...STATUS_META.PROCESSING },
            { value: 'QUOTED',        ...STATUS_META.QUOTED,        label: 'Chốt giá (Đã báo giá)' },
            { value: 'NEED_MORE_INFO',...STATUS_META.NEED_MORE_INFO, label: 'Trả lại Sale (Cần bổ sung)' },
            { value: 'REJECTED',      ...STATUS_META.REJECTED,      label: 'Từ chối hẳn' },
          ]}
          onChange={(val) => {
            if (val === 'QUOTED') onPricing(r.id);
            else if (val === 'NEED_MORE_INFO' && onReturn) onReturn(r.id);
            else if (val === 'REJECTED') onReject(r.id);
          }}
        />
      );
    }

    if (r.status === 'NEED_MORE_INFO') {
      return (
        <span className={clsx(statusPillCls, 'bg-[#fff7ed] text-[#c2410c] border border-[#ffedd5]')}>
          <RotateCcw size={13} color="#ea580c" /> Cần bổ sung
        </span>
      );
    }

    // Sửa giá đã báo (nếu được phép) — ADMIN mọi đơn, ORDER chỉ đơn mình báo giá.
    const canEditQuotedPrice =
      currentRole === 'ADMIN' ||
      (currentRole === 'ORDER' &&
        (r.assignee?.id === currentUser.id || r.assignee?.email === currentUser.email));

    if (r.status === 'QUOTED') {
      if (canEditQuotedPrice) {
        return (
          <StatusDropdown
            current="QUOTED"
            options={[
              { value: 'QUOTED', ...STATUS_META.QUOTED, label: 'Đã báo giá' },
              { value: 'EDIT_PRICE', label: 'Sửa giá đã báo', icon: <Edit size={13} />, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            ]}
            onChange={(val) => {
              if (val === 'EDIT_PRICE') onPricing(r.id);
            }}
          />
        );
      }
      return (
        <span className={clsx(statusPillCls, statusPillDoneCls)} title="Trạng thái hoàn tất">
          <CheckCircle size={13} color="#15803d" /> Đã báo giá
        </span>
      );
    }

    if (r.status === 'CLOSED') {
      if (canEditQuotedPrice) {
        return (
          <StatusDropdown
            current="CLOSED"
            options={[
              { value: 'CLOSED', ...STATUS_META.CLOSED, label: 'Đã chốt' },
              { value: 'EDIT_PRICE', label: 'Sửa giá đã báo', icon: <Edit size={13} />, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            ]}
            onChange={(val) => {
              if (val !== 'EDIT_PRICE') return;
              if (!window.confirm('Khách đã chốt giá này rồi. Sửa sẽ thay đổi giá đã thống nhất với khách — tiếp tục?')) return;
              onPricing(r.id);
            }}
          />
        );
      }
      return (
        <span className={clsx(statusPillCls, 'bg-[#f5f3ff] text-[#6d28d9] border border-[#ddd6fe]')} title="Khách đã chốt mua">
          <Award size={13} color="#6d28d9" /> Đã chốt
        </span>
      );
    }

    if (r.status === 'REJECTED') {
      return (
        <span className={clsx(statusPillCls, statusPillRejectCls)} title="Trạng thái từ chối">
          <XCircle size={13} color="#be123c" /> Từ chối hẳn
        </span>
      );
    }

    return <span className={clsx(statusPillCls, statusPillNewCls)}>{r.status}</span>;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-[6px] mb-[8px]">
        <span className="text-[14px] text-muted font-semibold">Độ cao dòng:</span>
        {ROW_HEIGHT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRowHeight(opt.value)}
            className={clsx(
              'py-[4px] px-[10px] rounded-[6px] text-[14px] font-bold border cursor-pointer',
              rowHeight === opt.value
                ? 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
                : 'bg-surface text-muted border-border hover:bg-[#f8fafc]',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="w-full overflow-x-auto border border-border rounded-[10px]">
      <table className={clsx(
        'w-full border-collapse text-[15.5px] [&_th]:text-left [&_th]:px-[10px] [&_th]:text-[14px] [&_th]:font-bold [&_th]:uppercase [&_th]:text-muted [&_th]:border-b [&_th]:border-border [&_th]:bg-[#f8fafc] [&_th]:whitespace-nowrap [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_td]:px-[10px] [&_td]:border-b [&_td]:border-[#f1f5f9] [&_td]:align-middle [&_td]:whitespace-nowrap [&_tr]:cursor-pointer [&_tr]:transition-[background] [&_tr]:duration-150 [&_tr:hover]:bg-[#f8fafc]',
        ROW_HEIGHT_CLS[rowHeight],
      )}>
        <thead>
          <tr>
            <th>Tên Sản Phẩm</th>
            <th>Thời Gian Tạo</th>
            <th>Trạng Thái</th>
            <th>Ảnh</th>
            <th>Danh Mục</th>
            <th>Chất Liệu</th>
            <th>Số Đo Kích Thước</th>
            <th className="text-[#3730a3]">VAT</th>
            <th className="text-[#0f766e]">Báo Giá Khách (Có VAT)</th>
            <th>Bộ Phận</th>
            <th>Nhân Viên Sale</th>
            <th>Mã Hỏi Giá</th>
            <th>Người Báo Giá</th>
            <th>
              <span className="inline-flex items-center gap-[4px]">
                Mốc Xử Lý
                <span
                  title={
                    'Nhận xử lý sau: từ lúc tạo yêu cầu đến lúc ORDER tiếp nhận.\n' +
                    'Báo giá sau: từ lúc tiếp nhận đến lúc báo giá.\n' +
                    'Trả lại sau: từ lúc tiếp nhận đến lúc trả lại Sale.'
                  }
                  className="inline-flex cursor-help text-faint"
                >
                  <HelpCircle size={13} />
                </span>
              </span>
            </th>
            <th>Tỷ Lệ Chốt</th>
            <th>Yêu Cầu / Muốn Nhận</th>
            <th>Khách Hàng / Hỏi Giá</th>
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

            const formattedPrice = priceVal > 0 ? formatCurrency(priceVal) : 'Chưa có';

            const priceOpt = getPrimaryOption(r);
            const priceBd = getPriceBreakdown({ priceBreakdown: priceOpt?.priceBreakdown });

            const displayCustomerName = r.customer?.name || r.requester?.name || '---';
            const displayDeptName = r.department?.name || '---';
            const displaySaleName = r.requester?.name || '---';
            const displayNote = r.desiredLeadTime || '---';

            // Chat chỉ giữa 2 người liên quan tới đơn (giống DetailPage) và chỉ có ý nghĩa khi đã
            // có người xử lý (assignee) — PENDING chưa ai nhận thì chưa có ai để nhắn.
            const isChatParticipant =
              (r.requester?.id ?? r.requesterId) === currentUser.id ||
              (r.assignee?.id ?? r.assigneeId) === currentUser.id;
            const canChat = isChatParticipant && !!(r.assignee?.id ?? r.assigneeId);
            const unread = unreadCounts[r.id] || 0;

            return (
              <tr
                key={r.id}
                className={clsx(
                  isSelected && '!bg-[#eff6ff]',
                  isRejected && '!bg-[#fff1f2] hover:!bg-[#ffe4e6] [&_td]:!border-[#fecdd3]',
                )}
                onClick={() => onSelect(r.id)}
              >
                <td>
                  <div className="inline-flex items-start gap-[6px]">
                    <div className="font-bold text-[#0f172a] max-w-[240px] whitespace-normal break-words leading-[1.5]">
                      {r.productName}
                    </div>
                    {canChat && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onOpenChat(r.id); }}
                        title={unread > 0 ? `${unread} tin nhắn chưa đọc` : 'Trao đổi'}
                        className="relative inline-flex items-center justify-center w-[20px] h-[20px] bg-transparent border-0 text-muted cursor-pointer p-0 shrink-0"
                      >
                        <MessageCircle size={14} />
                        {unread > 0 && (
                          <span className="absolute top-[-4px] right-[-5px] bg-[#ef4444] text-white rounded-full text-[12px] font-extrabold min-w-[13px] h-[13px] leading-[13px] text-center px-[2px]">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </td>
                <td className="text-muted text-[14px]">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '---'}
                </td>
                <td>{renderStatusCell(r, isMyReq)}</td>
                <td>
                  <div className="relative inline-block">
                    <img
                      src={r.images && r.images.length > 0 ? r.images[0].imageUrl : UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE}
                      className="w-[30px] h-[30px] rounded-[6px] object-cover border border-border cursor-zoom-in"
                      alt="SP"
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomScale(1);
                        setZoomedImage(r.images && r.images.length > 0 ? r.images[0].imageUrl : UI_CONSTANTS.FALLBACK_PRODUCT_IMAGE);
                      }}
                    />
                    {r.images && r.images.length > 1 && (
                      <span className="absolute bottom-[-2px] right-[-2px] bg-[#0f172a] text-surface text-[12.5px] font-extrabold py-[1px] px-[4px] rounded-[4px] border border-surface pointer-events-none">
                        +{r.images.length - 1}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="bg-[#f1f5f9] text-[#475569] py-[3px] px-[8px] rounded-[6px] text-[14px] font-semibold">
                    {r.category?.name || '---'}
                  </span>
                </td>
                <td>
                  <MaterialsCell materials={materialsList} />
                </td>
                <td className="text-[15px] font-semibold text-[#334155]">{r.customerMeasurements || '---'}</td>
                <td className="text-[#4338ca] font-bold text-center">
                  {currentRole === 'SALE'
                    ? (r.vat == null ? '---' : r.vat === 0 ? 'Không VAT' : 'Có VAT')
                    : (r.vat != null ? `${r.vat}%` : '---')}
                </td>
                {isRejected ? (
                  <td
                    className="bg-[#fff1f2] font-extrabold text-[#be123c] rounded-[6px] py-[6px] px-[8px]"
                    title={r.rejectReason ? `Lý do từ chối: ${r.rejectReason}` : 'Bị từ chối'}
                  >
                    <div className="inline-flex items-center gap-[5px]">
                      <span>Bị từ chối</span>
                      {r.rejectReason && (
                        <span className="text-[13px] bg-[#ffe4e6] text-[#9f1239] border border-[#fecdd3] py-[1px] px-[5px] rounded-[4px] cursor-help">
                          ⓘ Lý do
                        </span>
                      )}
                    </div>
                  </td>
                ) : priceVal > 0 ? (
                  (r.status === 'QUOTED' || r.status === 'CLOSED') ? (
                    <td className="text-[#0f766e] rounded-[6px] py-[6px] px-[8px] font-extrabold text-[16px]">
                      <div className="flex flex-col">
                        {formattedPrice}
                        {renderPriceBreakdownLines(priceBd)}
                      </div>
                    </td>
                  ) : (
                    <td
                      title="Giá tạm tính — Chưa được Admin/Order xác nhận, không được báo cho khách"
                      className="rounded-[6px] py-[6px] px-[8px]"
                    >
                      <div className="inline-flex flex-col items-start">
                        <span className="text-faint italic font-bold text-[15.5px] opacity-75">
                          {formattedPrice}
                        </span>
                        {renderPriceBreakdownLines(priceBd)}
                        <span className="text-[12.5px] text-[#ea580c] bg-[#fff7ed] border border-[#ffedd5] py-0 px-[4px] rounded-[3px] font-extrabold mt-[2px] leading-[14px]">
                          Chưa duyệt
                        </span>
                      </div>
                    </td>
                  )
                ) : (
                  <td className="text-faint text-center">---</td>
                )}
                <td>
                  <span className="bg-[#f1f5f9] text-[#475569] py-[3px] px-[8px] rounded-[6px] text-[14px] font-semibold">
                    {displayDeptName}
                  </span>
                </td>
                <td><strong className="text-[#334155]">{displaySaleName}</strong></td>
                <td>
                  <strong className="font-mono text-[15px] text-[#1e293b]">{r.code || r.id}</strong>
                </td>
                <td><strong className="text-[#334155]">{r.assignee?.name || 'Chưa phân công'}</strong></td>
                <td>{renderProcessingTimeCell(r)}</td>
                <td className="text-[14px] text-[#475569] font-semibold">
                  {r.closeRatePct !== undefined && r.closeRatePct !== null ? `${r.closeRatePct}%` : '---'}
                </td>
                <td className="text-[14px] text-[#d97706] max-w-[200px] whitespace-normal font-semibold leading-[1.5]">
                  {displayNote}
                </td>
                <td>
                  <div className="max-w-[180px] whitespace-normal font-bold text-[#0f172a] leading-[1.5]">{displayCustomerName}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

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
          className={clsx(
            'fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.85)] flex items-center justify-center p-[40px] overflow-auto',
            zoomScale > ZOOM_MIN ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-out',
            isDragging ? 'select-none' : 'select-auto',
          )}
        >
          <button
            type="button"
            onClick={() => { setZoomedImage(null); setZoomScale(1); }}
            className="fixed top-[20px] right-[24px] bg-[rgba(255,255,255,0.12)] border-0 rounded-full w-[40px] h-[40px] flex items-center justify-center text-white cursor-pointer z-[1]"
            title="Đóng"
          >
            <X size={20} />
          </button>
          <span className="fixed bottom-[20px] left-1/2 -translate-x-1/2 text-[rgba(255,255,255,0.7)] text-[15px] font-semibold">
            Lăn chuột để phóng to / thu nhỏ · Kéo ảnh để xem chỗ khác · {Math.round(zoomScale * 100)}%
          </span>
          <img
            src={zoomedImage}
            alt="Xem phóng to"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleImageMouseDown}
            className={clsx(
              'max-w-none h-auto shrink-0 object-contain rounded-[10px] shadow-[0_12px_40px_rgba(0,0,0,0.4)] m-auto',
              zoomScale > ZOOM_MIN ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
              isDragging ? 'transition-none' : 'transition-[width_0.05s_linear]',
            )}
            // động — giữ inline
            style={{
              width: `${70 * zoomScale}vw`,
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
};
