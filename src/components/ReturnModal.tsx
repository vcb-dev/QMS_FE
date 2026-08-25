import React from 'react';
import { RotateCcw } from 'lucide-react';
import { ReasonPromptModal } from './ReasonPromptModal';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ isOpen, onClose, onSubmit }) => (
  <ReasonPromptModal
    isOpen={isOpen}
    onClose={onClose}
    onSubmit={onSubmit}
    headerColor="#ea580c"
    title="Trả Lại Yêu Cầu Cho Sale (Cần Bổ Sung)"
    label="Lý do trả lại bổ sung thông tin"
    requiredNote="* (Bắt buộc)"
    placeholder="Nhập lý do cần bổ sung (ví dụ: Ảnh mờ không rõ kiểu chấu đính đá, thiếu kích thước nhẫn...)..."
    validationMsg="BẮT BUỘC nhập lý do trả lại để Sale biết đường bổ sung!"
    errorFallbackMsg="Lỗi trả lại yêu cầu"
    submitButtonClassName="btn-insp btn-insp-primary"
    submitButtonStyle={{ background: '#ea580c' }}
    submitIcon={<RotateCcw size={16} />}
    submitLabel="Trả Lại Cho Sale"
  />
);
