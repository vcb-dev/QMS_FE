import React from 'react';
import { CheckCircle, XCircle, FilePlus, Clock, RotateCcw, Award, Ban } from 'lucide-react';
import { STATUS_BADGE_META } from './index';

// Một lựa chọn trong dropdown trạng thái (components/StatusDropdown) — icon + màu theo trạng thái đích.
export type StatusOption = {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
};

// Nhãn/màu/icon của từng trạng thái trên nút dropdown và trong menu; màu lấy từ STATUS_BADGE_META.
export const STATUS_DROPDOWN_META: Record<string, Omit<StatusOption, 'value'>> = {
  PENDING:       { ...STATUS_BADGE_META.PENDING,        icon: <FilePlus size={13} /> },
  PROCESSING:    { ...STATUS_BADGE_META.PROCESSING,     icon: <Clock size={13} /> },
  QUOTED:        { ...STATUS_BADGE_META.QUOTED,         icon: <CheckCircle size={13} /> },
  REJECTED:      { ...STATUS_BADGE_META.REJECTED,       icon: <XCircle size={13} /> },
  NEED_MORE_INFO:{ ...STATUS_BADGE_META.NEED_MORE_INFO, icon: <RotateCcw size={13} /> },
  CLOSED:        { ...STATUS_BADGE_META.CLOSED,         icon: <Award size={13} /> },
  CANCELLED:     { ...STATUS_BADGE_META.CANCELLED,      icon: <Ban size={13} /> },
};
