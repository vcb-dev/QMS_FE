import React from 'react';
import { XCircle } from 'lucide-react';
import { ReasonPromptModal } from './ReasonPromptModal';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, onSubmit }) => (
  <ReasonPromptModal
    isOpen={isOpen}
    onClose={onClose}
    onSubmit={onSubmit}
    headerColor="#be123c"
    title="Từ Chối Yêu Cầu Báo Giá"
    label="Lý do từ chối"
    requiredNote="* (Bắt buộc theo đặc tả)"
    placeholder="Nhập lý do không thể báo giá (ví dụ: Thiếu thông tin số đo, xưởng hết phôi gỗ...)..."
    validationMsg="Theo đặc tả: BẮT BUỘC phải nhập lý do từ chối!"
    errorFallbackMsg="Lỗi từ chối yêu cầu"
    submitButtonClassName="btn-insp btn-insp-danger"
    submitIcon={<XCircle size={16} />}
    submitLabel="Xác Nhận Từ Chối"
  />
);
