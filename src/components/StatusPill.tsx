import React from 'react';
import { FilePlus, Clock, CheckCircle, XCircle, RotateCcw, Award } from 'lucide-react';
import { STATUS_BADGE_META } from '../constants';

const STATUS_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  PENDING: FilePlus,
  PROCESSING: Clock,
  QUOTED: CheckCircle,
  REJECTED: XCircle,
  NEED_MORE_INFO: RotateCcw,
  CLOSED: Award,
};

interface StatusPillProps {
  status: string;
  label: string;
  iconSize?: number;
  style?: React.CSSProperties;
  title?: string;
}

// Badge trạng thái dùng chung — màu/nền/viền LUÔN lấy từ STATUS_BADGE_META (constants.ts), không
// khai lại hex riêng. Nhãn/kích cỡ khác nhau theo màn (Dashboard/DetailPage) nên truyền qua props
// thay vì đoán mặc định, tránh đổi nhầm chữ hiển thị của màn nào.
export const StatusPill: React.FC<StatusPillProps> = ({ status, label, iconSize = 12, style, title }) => {
  const meta = STATUS_BADGE_META[status];
  const Icon = STATUS_ICONS[status];

  if (!meta) {
    return <span className="status-pill new" title={title}>{label}</span>;
  }

  return (
    <span
      className="status-pill"
      title={title}
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, ...style }}
    >
      {Icon && <Icon size={iconSize} />}
      {label}
    </span>
  );
};
