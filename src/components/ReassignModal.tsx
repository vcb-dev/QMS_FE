import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { X, ArrowRightLeft } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { getAllUsersApi } from '../services/api';
import type { StaffUser } from '../types';
import {
  modalBackdropCls,
  modalCardCls,
  modalHeaderCls,
  modalBodyCls,
  modalFooterCls,
  formGroupCls,
  formLabelCls,
  formReqCls,
  formControlCls,
  toolBtnCls,
  btnInspPrimaryCls,
} from '../styles/classNames';

interface ReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newAssigneeId: string) => Promise<void>;
  currentAssigneeId?: string | null;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentAssigneeId,
}) => {
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderUsers, setOrderUsers] = useState<StaffUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const dialogRef = useModalA11y(onClose, isOpen);

  // Tự tải danh sách Order mỗi lần mở modal — không phụ thuộc prop từ trang cha, tránh phải xuyên
  // 1 danh sách user qua nhiều tầng component chỉ để dùng đúng chỗ này.
  useEffect(() => {
    if (!isOpen) return;
    setNewAssigneeId('');
    setLoadingUsers(true);
    getAllUsersApi()
      .then((users) => setOrderUsers(users.filter((u) => u.role === 'ORDER' && u.isApproved && u.isActive)))
      .catch(() => setOrderUsers([]))
      .finally(() => setLoadingUsers(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const candidates = orderUsers.filter((u) => u.id !== currentAssigneeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssigneeId) {
      alert('Vui lòng chọn Order sẽ tiếp nhận yêu cầu này!');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(newAssigneeId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chuyển giao yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalBackdropCls}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chuyển Giao Yêu Cầu"
        tabIndex={-1}
        className={clsx(modalCardCls, '!max-w-[440px]')}
      >
        <div className={modalHeaderCls} style={{ color: '#7c3aed' }}>
          <h2 style={{ color: '#7c3aed' }}>Chuyển Giao Yêu Cầu</h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer" style={{ color: '#7c3aed' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={modalBodyCls}>
            <div className={formGroupCls}>
              <label className={formLabelCls}>Chuyển cho Order <span className={formReqCls}>*</span></label>
              <select
                className={formControlCls}
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">{loadingUsers ? 'Đang tải...' : '-- Chọn Order --'}</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {!loadingUsers && candidates.length === 0 && (
                <p className="text-[13.5px] text-faint mt-[6px]">Không có Order nào khác để chuyển giao.</p>
              )}
            </div>
          </div>

          <div className={modalFooterCls}>
            <button type="button" className={toolBtnCls} onClick={onClose}>Hủy</button>
            <button type="submit" className={clsx(btnInspPrimaryCls, '!bg-[#7c3aed]')} disabled={submitting || candidates.length === 0}>
              <ArrowRightLeft size={16} /> Xác Nhận Chuyển Giao
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
