import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import { COMPANY_LOGO_URL } from '../constants';

interface NotFoundPageProps {
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  showHome?: boolean;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  title = 'Không tìm thấy trang yêu cầu',
  description = 'Đường dẫn bạn đang truy cập không tồn tại, đã bị thay đổi hoặc yêu cầu báo giá này không còn trên hệ thống.',
  backTo,
  backLabel = 'Quay lại',
  showHome = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-[32px] px-[20px] box-border">
      <div className="w-full max-w-[520px] bg-surface rounded-[24px] py-[40px] px-[32px] text-center shadow-[0_20px_40px_-15px_rgba(15,23,42,0.08),0_0_0_1px_#e2e8f0] flex flex-col items-center">
        {/* Brand Logo */}
        <img
          src={COMPANY_LOGO_URL}
          alt="Viễn Chí Bảo"
          className="h-[36px] object-contain mb-[24px]"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* 404 Badge with Icon */}
        <div className="relative mb-[20px] inline-flex items-center justify-center">
          <div className="text-[72px] font-black tracking-[-3px] leading-none bg-[linear-gradient(135deg,#cbd5e1_0%,#94a3b8_100%)] bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute -bottom-[4px] -right-[8px] w-[36px] h-[36px] rounded-[12px] bg-[#eff6ff] border-2 border-surface flex items-center justify-center text-primary shadow-[0_4px_10px_rgba(37,99,235,0.15)]">
            <FileQuestion size={20} />
          </div>
        </div>

        {/* Text Details */}
        <h2 className="text-[18px] font-extrabold text-text mt-0 mx-0 mb-[10px] tracking-[-0.2px]">
          {title}
        </h2>
        <p className="text-[13.5px] text-muted mt-0 mx-0 mb-[28px] leading-[1.5] max-w-[380px]">
          {description}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-[12px] justify-center w-full max-w-[360px] flex-wrap">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-[8px] bg-text text-surface border-0 rounded-[12px] py-[12px] px-[18px] text-[13.5px] font-bold cursor-pointer shadow-[0_4px_12px_rgba(15,23,42,0.2)] transition-all duration-150 ease-out"
          >
            <ArrowLeft size={16} /> {backLabel}
          </button>

          {showHome && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-[8px] bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] rounded-[12px] py-[12px] px-[18px] text-[13.5px] font-bold cursor-pointer transition-all duration-150 ease-out"
            >
              <Home size={16} /> Về trang chủ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
