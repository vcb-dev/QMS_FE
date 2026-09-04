import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { LoginPageProps, AuthMode } from '../types';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi, redirectToLarkLogin } from '../services/api';
import {
  Lock, Mail, UserPlus, KeyRound, ArrowLeft, ArrowRight, CheckCircle2,
  User as UserIcon, Briefcase, Eye, EyeOff,
} from 'lucide-react';
import { COMPANY_LOGO_URL, BACKGROUND_IMAGE_URL } from '../constants';
import { clsx } from 'clsx';
import {
  backLinkCls,
  fieldLabelCls,
  fieldIconCls,
  fieldInputCls,
  goldButtonCls,
} from '../styles/classNames';

// Khối "nhãn + icon + input" dùng chung cho 8/10 field trong 4 form đăng nhập/đăng ký/quên-đặt lại
// mật khẩu — trước đây lặp lại y hệt cấu trúc DOM này ở từng form. Field có nút hiện/ẩn mật khẩu
// hoặc dùng <select> thay <input> giữ nguyên JSX riêng, không ép qua đây.
const LabeledIconField: React.FC<{
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  inputClassName?: string;
}> = ({ label, icon, type = 'text', value, onChange, placeholder, maxLength, inputClassName }) => (
  <div className="flex flex-col gap-[6px]">
    <label className={fieldLabelCls}>{label}</label>
    <div className="relative flex items-center">
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={clsx(fieldInputCls, inputClassName)}
      />
    </div>
  </div>
);

export const LoginPage: React.FC<LoginPageProps> = ({ currentUser, onLoginSuccess }) => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  // Tự đăng ký chỉ chọn được SALE/ORDER — ADMIN không tự cấp được, phải nhờ 1 ADMIN khác cấp tay.
  const [role, setRole] = useState<'SALE' | 'ORDER'>('SALE');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [larkLoading, setLarkLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lấy lỗi từ query string (nếu redirect từ Backend về có mang theo lỗi OAuth)
  const { search } = window.location;
  React.useEffect(() => {
    const params = new URLSearchParams(search);
    const errorParam = params.get('error');
    if (errorParam) {
      if (errorParam === 'LarkAuthFailed') {
        setErrorMsg('Bạn đã từ chối cấp quyền hoặc quá trình đăng nhập Lark bị hủy.');
      } else if (errorParam === 'LarkLoginError') {
        const reason = params.get('reason');
        setErrorMsg(reason || 'Lỗi máy chủ khi xác thực Lark. Vui lòng thử lại sau.');
      } else {
        setErrorMsg(`Lỗi đăng nhập: ${errorParam}`);
      }
      
      // Xóa params khỏi URL để không bị báo lỗi liên tục khi refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [search]);

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const goToMode = (m: AuthMode) => {
    setMode(m);
    clearMessages();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập Tên đăng nhập và Mật khẩu');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const data = await loginApi(email, password, rememberMe);
      onLoginSuccess(data.user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const data = await registerApi({ name, email, password, role });
      setSuccessMsg(data.message || 'Đăng ký thành công! Tài khoản của bạn đang CHỜ ADMIN PHÊ DUYỆT.');
      setTimeout(() => goToMode('login'), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký thất bại. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Vui lòng nhập Email đã đăng ký');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const res = await forgotPasswordApi(email);
      setSuccessMsg(res.message);
      if (res.otp) {
        setOtp(res.otp); // Tự điền OTP thử nghiệm nếu có
      }
      setTimeout(() => setMode('reset'), 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || !newPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ Email, Mã OTP và Mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const res = await resetPasswordApi({ email, otp, newPassword });
      setSuccessMsg(res.message || 'Đặt lại mật khẩu thành công!');
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword);
        clearMessages();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đặt lại mật khẩu không thành công');
    } finally {
      setLoading(false);
    }
  };


  const modeCopy: Record<AuthMode, { title: string; subtitle: string }> = {
    login: { title: 'Đăng nhập hệ thống', subtitle: 'Hệ thống Quản lý Báo giá' },
    register: { title: 'Yêu cầu quyền truy cập', subtitle: 'Hệ thống Quản lý Báo giá' },
    forgot: { title: 'Quên mật khẩu', subtitle: 'Hệ thống Quản lý Báo giá' },
    reset: { title: 'Đặt lại mật khẩu', subtitle: 'Hệ thống Quản lý Báo giá' },
  };

  return (
    <div
      className="min-h-screen flex flex-col py-[40px] px-[20px] bg-cover bg-[center_35%] bg-no-repeat overflow-y-auto"
      // động — giữ inline
      style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 30, 0.35), rgba(10, 15, 30, 0.55)), url(${BACKGROUND_IMAGE_URL})`,
      }}
    >
      <div className="w-full max-w-[420px] m-auto bg-[#fffdf9] rounded-[20px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] shrink-0">
        {/* Thanh vàng thương hiệu trên cùng */}
        <div className="h-[5px] bg-[linear-gradient(90deg,#fde68a,#f0b429,#b45309)]" />

        <div className="pt-[32px] px-[36px] pb-[36px]">
          {/* Brand Header */}
          <div className="text-center mb-[22px]">
            <img
              src={COMPANY_LOGO_URL}
              alt="Viễn Chí Bảo"
              className="h-[52px] object-contain block mt-0 mx-auto mb-[14px]"
            />
            <h1 className="text-[19px] font-extrabold text-[#1f2937] m-0">
              {modeCopy[mode].title}
            </h1>
            <p className="text-[12px] text-[#9ca3af] mt-[4px] mr-0 mb-0 ml-0 tracking-[0.3px]">
              {modeCopy[mode].subtitle}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#b91c1c] py-[10px] px-[14px] rounded-[10px] text-[12.5px] mb-[16px] text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-[#f0fdf4] border border-[#86efac] text-[#15803d] py-[10px] px-[14px] rounded-[10px] text-[12.5px] mb-[16px] flex items-center justify-center gap-[8px]">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <>
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-[16px]">
                <LabeledIconField
                  label="Tên đăng nhập"
                  icon={<UserIcon size={16} className={fieldIconCls} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Nhập tên đăng nhập (email)"
                />

                <div className="flex flex-col gap-[6px]">
                  <div className="flex justify-between items-center">
                    <label className={fieldLabelCls}>Mật khẩu</label>
                    <button
                      type="button"
                      onClick={() => goToMode('forgot')}
                      className="bg-transparent border-0 text-[#b45309] text-[12px] cursor-pointer p-0 font-semibold"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock size={16} className={fieldIconCls} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      className={clsx(fieldInputCls, 'pr-[40px]')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      className="absolute right-[12px] bg-transparent border-0 text-[#9ca3af] cursor-pointer flex"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-[8px] text-[12.5px] text-[#4b5563] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-[15px] h-[15px] accent-[#d97706] cursor-pointer"
                  />
                  Ghi nhớ đăng nhập
                </label>

                <button type="submit" disabled={loading} className={goldButtonCls}>
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              {/* Nút đăng nhập Lark */}
              <div className="mt-[20px] flex flex-col gap-[16px]">
                <div className="flex items-center gap-[10px]">
                  <div className="flex-1 h-[1px] bg-[#e5e7eb]"></div>
                  <span className="text-[12px] text-[#9ca3af] font-semibold">HOẶC</span>
                  <div className="flex-1 h-[1px] bg-[#e5e7eb]"></div>
                </div>

                <button
                  type="button"
                  disabled={larkLoading}
                  onClick={() => {
                    if (larkLoading) return;
                    setLarkLoading(true);
                    redirectToLarkLogin();
                  }}
                  className={clsx(
                    'grid grid-cols-[1fr_auto_1fr] items-center w-full py-[6px] px-0 bg-surface border border-[#d1d5db] rounded-[12px] text-[14.5px] font-semibold text-[#374151] shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200',
                    larkLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[#f9fafb] hover:border-[#9ca3af]'
                  )}
                >
                  <div className="flex justify-end pr-[12px]">
                    <img
                      src="https://p16-hera-overseas.larksuitecdn.com/tos-mya-i-lojyj5t9n9/f3f7b6969eb14364be035282e866b7bb.png~tplv-lojyj5t9n9-png:0:0.png"
                      alt="Lark Logo"
                      className="w-[38px] h-[38px] object-contain"
                    />
                  </div>
                  <span>{larkLoading ? 'Đang chuyển tới Lark...' : 'Đăng nhập qua Lark'}</span>
                  <div />
                </button>
              </div>

              <p className="text-center text-[12.5px] text-[#9ca3af] mt-[24px]">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => goToMode('register')}
                  className="bg-transparent border-0 text-[#b45309] font-bold text-[12.5px] cursor-pointer p-0"
                >
                  Yêu cầu quyền truy cập
                </button>
              </p>
            </>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-[14px]">
              <LabeledIconField label="Họ Và Tên" icon={<UserIcon size={16} className={fieldIconCls} />} value={name} onChange={setName} placeholder="Ví dụ: Nguyễn Văn A" />

              <LabeledIconField label="Email Công Việc" icon={<Mail size={16} className={fieldIconCls} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <LabeledIconField
                label="Mật Khẩu (Khởi tạo)"
                icon={<Lock size={16} className={fieldIconCls} />}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Nhập tối thiểu 6 ký tự"
              />

              <div className="flex flex-col gap-[6px]">
                <label className={fieldLabelCls}>Vai Trò Trong Hệ Thống</label>
                <div className="relative flex items-center">
                  <Briefcase size={16} className={fieldIconCls} />
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} className={clsx(fieldInputCls, 'cursor-pointer')}>
                    <option value="SALE">Chuyên Viên Kinh Doanh (SALE)</option>
                    <option value="ORDER">Chuyên Viên Báo Giá (ORDER)</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className={clsx(goldButtonCls, 'mt-[4px]')}>
                <UserPlus size={18} />
                {loading ? 'Đang xử lý tạo tài khoản...' : 'Gửi Yêu Cầu Truy Cập'}
              </button>

              <button type="button" onClick={() => goToMode('login')} className={backLinkCls}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-[16px]">
              <p className="text-[13px] text-[#6b7280] leading-[1.5] m-0 text-center">
                Nhập email tài khoản của bạn. Hệ thống sẽ cấp mã xác thực OTP (6 chữ số) để đặt lại mật khẩu mới.
              </p>

              <LabeledIconField label="Email Đã Đăng Ký" icon={<Mail size={16} className={fieldIconCls} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <button type="submit" disabled={loading} className={goldButtonCls}>
                <KeyRound size={18} />
                {loading ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực OTP'}
              </button>

              <button type="button" onClick={() => goToMode('login')} className={backLinkCls}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}

          {/* 4. RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-[14px]">
              <p className="text-[13px] text-[#6b7280] leading-[1.5] m-0 text-center">
                Nhập mã OTP 6 chữ số vừa nhận được và thiết lập mật khẩu mới của bạn.
              </p>

              <LabeledIconField label="Email" icon={<Mail size={16} className={fieldIconCls} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <LabeledIconField
                label="Mã Xác Thực OTP (6 chữ số)"
                icon={<KeyRound size={16} className={clsx(fieldIconCls, 'text-[#d97706]')} />}
                value={otp}
                onChange={setOtp}
                maxLength={6}
                inputClassName="border border-[#f0b429] text-[#92400e] font-bold tracking-[3px]"
              />

              <LabeledIconField
                label="Mật Khẩu Mới"
                icon={<Lock size={16} className={fieldIconCls} />}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Nhập tối thiểu 6 ký tự"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[linear-gradient(135deg,#16a34a_0%,#15803d_100%)] text-surface border-0 rounded-[10px] p-[13px] text-[14.5px] font-bold cursor-pointer flex items-center justify-center gap-[8px] shadow-[0_6px_16px_rgba(22,163,74,0.35)]"
              >
                <CheckCircle2 size={18} />
                {loading ? 'Đang cập nhật mật khẩu...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
              </button>

              <button type="button" onClick={() => goToMode('login')} className={backLinkCls}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
