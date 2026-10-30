import { Ban, Edit, RotateCcw, Undo2 } from 'lucide-react';
import type { QuoteRequest, Role, User } from '../types';
import { STATUS_DROPDOWN_META, type StatusOption } from '../constants/statusDropdown';

// Quy tắc "role + trạng thái đơn -> dropdown trạng thái có những lựa chọn nào, bấm thì làm gì" — nguồn
// DUY NHẤT cho cả bảng danh sách (QuoteTable) lẫn trang chi tiết (DetailPage), để hai nơi không lệch nhau.
// Trả null = không có thao tác nào cho người này ở trạng thái này -> chỗ gọi tự vẽ pill tĩnh.

export interface StatusActionHandlers {
  onEdit: (req: QuoteRequest) => void;
  onAccept: (id: string, version: number) => void;
  onQuoteNow: (id: string, version: number) => void;
  onPricing: (id: string) => void;
  onReject: (id: string) => void;
  onReturn?: (id: string) => void;
  // Truyền kèm `req`: trang chi tiết có thể đang xem đơn không nằm trong trang danh sách đã tải.
  onResubmit?: (id: string, req?: QuoteRequest) => void;
  onMarkClosed?: (id: string, req?: QuoteRequest) => void;
  // Bỏ "Đã chốt" (chốt nhầm): Sale tạo đơn hoặc Admin.
  onUnmarkClosed?: (id: string) => void;
  // Chỗ gọi tự hỏi xác nhận trước khi hủy/khôi phục (mỗi nơi có câu chữ riêng) — ở đây chỉ chuyển tiếp.
  onCancel?: (req: QuoteRequest) => void;
  onRestore?: (req: QuoteRequest) => void;
  // Mặc định window.confirm; tách ra để kiểm thử mà không cần trình duyệt.
  confirm?: (message: string) => boolean;
}

export interface StatusDropdownConfig {
  current: string;
  options: StatusOption[];
  onChange: (value: string) => void;
}

// ORDER: đơn mình đang xử lý (assignee). SALE/ADMIN: đơn mình tạo. Có dự phòng so theo id khi bản
// chi tiết (trang chi tiết) không kèm object requester/assignee lồng nhau như dòng trong danh sách.
export function isOwnRequest(r: QuoteRequest, role: Role, user: User): boolean {
  if (role === 'ORDER') {
    return r.assignee?.id === user.id || r.assignee?.email === user.email || r.assigneeId === user.id;
  }
  return (
    r.createdBy?.id === user.id ||
    r.requester?.id === user.id ||
    r.requester?.email === user.email ||
    r.requesterId === user.id
  );
}

const EDIT_STYLE = { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };
const EDIT_PRICE_OPTION: StatusOption = {
  value: 'EDIT_PRICE', label: 'Sửa giá đã báo', icon: <Edit size={13} />, ...EDIT_STYLE,
};
const CANCEL_OPTION: StatusOption = {
  value: 'CANCEL', label: 'Hủy yêu cầu', icon: <Ban size={13} />, color: '#be123c', bg: '#fff1f2', border: '#fecdd3',
};
const RESTORE_OPTION: StatusOption = {
  value: 'RESTORE', label: 'Khôi phục', icon: <RotateCcw size={13} />, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
};

const META = STATUS_DROPDOWN_META;
const MARK_CLOSED_OPTION: StatusOption = { value: 'CLOSED', ...META.CLOSED, label: 'Đánh Dấu Đã Chốt' };
const UNMARK_CLOSED_OPTION: StatusOption = {
  value: 'UNMARK_CLOSED', label: 'Bỏ đã chốt', icon: <Undo2 size={13} />, color: '#b45309', bg: '#fffbeb', border: '#fde68a',
};
const UNMARK_CLOSED_CONFIRM = 'Bỏ đánh dấu Đã chốt? Đơn sẽ quay về "Đã báo giá" và có thể chốt lại.';

export function getStatusDropdown(
  r: QuoteRequest,
  ctx: { role: Role; user: User },
  h: StatusActionHandlers,
): StatusDropdownConfig | null {
  const { role, user } = ctx;
  const confirm = h.confirm ?? ((message: string) => window.confirm(message));
  const canCancel = role === 'ADMIN' && !!h.onCancel;
  const canRestore = role === 'ADMIN' && !!h.onRestore;
  const cancelOptions: StatusOption[] = canCancel ? [CANCEL_OPTION] : [];

  // Giá trị khác CANCEL/RESTORE thì bỏ qua.
  const cancelOrRestore = (val: string) => {
    if (val === 'CANCEL') h.onCancel?.(r);
    else if (val === 'RESTORE') h.onRestore?.(r);
  };

  // ── SALE: chỉ thao tác trên đơn của chính mình ──
  if (role === 'SALE') {
    if (!isOwnRequest(r, role, user)) return null;

    if (r.status === 'PENDING') {
      return {
        current: 'PENDING',
        options: [{ value: 'EDIT', label: 'Sửa yêu cầu', icon: <Edit size={13} />, ...EDIT_STYLE }],
        onChange: (val) => { if (val === 'EDIT') h.onEdit(r); },
      };
    }

    if (r.status === 'NEED_MORE_INFO') {
      return {
        current: 'NEED_MORE_INFO',
        options: [
          { value: 'EDIT', label: 'Sửa / Bổ sung', icon: <Edit size={13} />, color: '#c2410c', bg: '#fff7ed', border: '#ffedd5' },
          ...(h.onResubmit
            ? [{ value: 'RESUBMIT', label: 'Gửi lại (không sửa gì)', icon: <RotateCcw size={13} />, color: '#b45309', bg: '#fffbeb', border: '#fde68a' }]
            : []),
        ],
        onChange: (val) => {
          if (val === 'EDIT') h.onEdit(r);
          else if (val === 'RESUBMIT') h.onResubmit?.(r.id, r);
        },
      };
    }

    if (r.status === 'QUOTED' && h.onMarkClosed) {
      return {
        current: 'QUOTED',
        options: [MARK_CLOSED_OPTION],
        onChange: (val) => { if (val === 'CLOSED') h.onMarkClosed?.(r.id, r); },
      };
    }

    // Chốt nhầm: Sale tạo đơn bỏ được "Đã chốt" (đơn về lại "Đã báo giá"). Sửa giá thì chỉ Admin.
    if (r.status === 'CLOSED' && h.onUnmarkClosed) {
      return {
        current: 'CLOSED',
        options: [{ value: 'CLOSED', ...META.CLOSED, label: 'Đã chốt' }, UNMARK_CLOSED_OPTION],
        onChange: (val) => {
          if (val === 'UNMARK_CLOSED' && confirm(UNMARK_CLOSED_CONFIRM)) h.onUnmarkClosed?.(r.id);
        },
      };
    }

    return null;
  }

  // ── ORDER / ADMIN ──
  switch (r.status) {
    case 'PENDING':
      return {
        current: 'PENDING',
        options: [
          { value: 'PENDING',    ...META.PENDING,    label: 'Yêu cầu mới' },
          { value: 'PROCESSING', ...META.PROCESSING, label: 'Tiếp nhận (Đang xử lý)' },
          { value: 'QUOTE_NOW',  ...META.QUOTED,     label: 'Báo giá luôn' },
          ...cancelOptions,
        ],
        onChange: (val) => {
          if (val === 'PROCESSING') h.onAccept(r.id, r.version);
          // Báo giá luôn: tiếp nhận + khóa đơn rồi mở modal nhập giá. Nếu người khác vừa tiếp
          // nhận trước, bước tiếp nhận sẽ báo lỗi và modal không mở (xử lý ở onQuoteNow).
          else if (val === 'QUOTE_NOW') h.onQuoteNow(r.id, r.version);
          cancelOrRestore(val);
        },
      };

    case 'PROCESSING': {
      // BE cho phép bất kỳ Order nào báo giá thẳng vào request đang do Order khác tiếp nhận
      // (fix/quote-any-order-can-quote). Tuy nhiên REJECT/RETURN vẫn chỉ dành cho assignee hiện tại.
      if (role === 'ORDER' && !isOwnRequest(r, role, user)) {
        return {
          current: 'PROCESSING',
          options: [
            { value: 'PROCESSING', ...META.PROCESSING },
            { value: 'QUOTED',     ...META.QUOTED, label: 'Chốt giá (Đã báo giá)' },
          ],
          onChange: (val) => { if (val === 'QUOTED') h.onPricing(r.id); },
        };
      }
      return {
        current: 'PROCESSING',
        options: [
          { value: 'PROCESSING',     ...META.PROCESSING },
          { value: 'QUOTED',         ...META.QUOTED,         label: 'Chốt giá (Đã báo giá)' },
          { value: 'NEED_MORE_INFO', ...META.NEED_MORE_INFO, label: 'Trả lại Sale (Cần bổ sung)' },
          { value: 'REJECTED',       ...META.REJECTED,       label: 'Từ chối hẳn' },
          ...cancelOptions,
        ],
        onChange: (val) => {
          if (val === 'QUOTED') h.onPricing(r.id);
          else if (val === 'NEED_MORE_INFO' && h.onReturn) h.onReturn(r.id);
          else if (val === 'REJECTED') h.onReject(r.id);
          cancelOrRestore(val);
        },
      };
    }

    case 'NEED_MORE_INFO':
      if (!canCancel) return null;
      return {
        current: 'NEED_MORE_INFO',
        options: [{ value: 'NEED_MORE_INFO', ...META.NEED_MORE_INFO, label: 'Cần bổ sung' }, ...cancelOptions],
        onChange: cancelOrRestore,
      };

    // Sửa giá đã báo — ADMIN mọi đơn, ORDER bất kỳ (không cần là assignee, đồng bộ BE fix).
    // Đánh dấu Đã chốt — BE chỉ cho SALE (đơn của mình) và ADMIN (mọi đơn), ORDER thì không.
    case 'QUOTED': {
      const canMarkClosed = role === 'ADMIN' && !!h.onMarkClosed;
      return {
        current: 'QUOTED',
        options: [
          { value: 'QUOTED', ...META.QUOTED, label: 'Đã báo giá' },
          ...(canMarkClosed ? [MARK_CLOSED_OPTION] : []),
          EDIT_PRICE_OPTION,
          ...cancelOptions,
        ],
        onChange: (val) => {
          if (val === 'CLOSED') h.onMarkClosed?.(r.id, r);
          else if (val === 'EDIT_PRICE') h.onPricing(r.id);
          cancelOrRestore(val);
        },
      };
    }

    // Đã chốt (khách đồng ý mua): CHỈ ADMIN thao tác — bỏ chốt, sửa giá (phải xác nhận vì là giá đã thống
    // nhất với khách) hoặc hủy yêu cầu. Order không còn thao tác nào.
    case 'CLOSED':
      if (role !== 'ADMIN') return null;
      return {
        current: 'CLOSED',
        options: [
          { value: 'CLOSED', ...META.CLOSED, label: 'Đã chốt' },
          ...(h.onUnmarkClosed ? [UNMARK_CLOSED_OPTION] : []),
          EDIT_PRICE_OPTION,
          ...cancelOptions,
        ],
        onChange: (val) => {
          if (val === 'UNMARK_CLOSED') {
            if (confirm(UNMARK_CLOSED_CONFIRM)) h.onUnmarkClosed?.(r.id);
          } else if (val === 'EDIT_PRICE') {
            if (confirm('Khách đã chốt giá này rồi. Sửa sẽ thay đổi giá đã thống nhất với khách — tiếp tục?')) h.onPricing(r.id);
          }
          cancelOrRestore(val);
        },
      };

    // Chỉ ADMIN nhận được đơn ở trạng thái này (tab "Đã hủy").
    case 'CANCELLED':
      if (!canRestore) return null;
      return {
        current: 'CANCELLED',
        options: [{ value: 'CANCELLED', ...META.CANCELLED, label: 'Đã hủy' }, RESTORE_OPTION],
        onChange: cancelOrRestore,
      };

    default:
      return null;
  }
}
