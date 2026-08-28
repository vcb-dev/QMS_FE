import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { LoginPageProps, AuthMode } from '../types';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi, redirectToLarkLogin } from '../services/api';
import {
  Lock, Mail, UserPlus, KeyRound, ArrowLeft, ArrowRight, CheckCircle2,
  User as UserIcon, Briefcase, Eye, EyeOff,
} from 'lucide-react';
import { COMPANY_LOGO_URL, BACKGROUND_IMAGE_URL } from '../constants';
import {backLinkStyle, fieldLabelStyle,fieldIconStyle,fieldInputStyle,goldButtonStyle} from '../styles/card';

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
  inputStyle?: React.CSSProperties;
}> = ({ label, icon, type = 'text', value, onChange, placeholder, maxLength, inputStyle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{ ...fieldInputStyle, ...inputStyle }}
      />
    </div>
  </div>
);

export const LoginPage: React.FC<LoginPageProps> = ({ currentUser, onLoginSuccess }) => {
  const navigate = useNavigate();

  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('sale@vcb.vn');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  // Tự đăng ký chỉ chọn được SALE/ORDER — ADMIN không tự cấp được, phải nhờ 1 ADMIN khác cấp tay.
  const [role, setRole] = useState<'SALE' | 'ORDER'>('SALE');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI feedback states
  const [loading, setLoading] = useState(false);
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
        setErrorMsg('Lỗi máy chủ khi xác thực Lark. Vui lòng thử lại sau.');
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column', // Thêm flex-col
      padding: '40px 20px',
      background: `linear-gradient(rgba(10, 15, 30, 0.35), rgba(10, 15, 30, 0.55)), url(${BACKGROUND_IMAGE_URL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 35%',
      backgroundRepeat: 'no-repeat',
      overflowY: 'auto', // Đảm bảo cuộn được trên màn bé
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        margin: 'auto', // Quan trọng: chống bị khuất top khi màn hình quá thấp (flex bug)
        background: '#fffdf9',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5)',
        flexShrink: 0, // Đảm bảo card không bị ép lại
      }}>
        {/* Thanh vàng thương hiệu trên cùng */}
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #fde68a, #f0b429, #b45309)' }} />

        <div style={{ padding: '32px 36px 36px' }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <img
              src={COMPANY_LOGO_URL}
              alt="Viễn Chí Bảo"
              style={{ height: '52px', objectFit: 'contain', display: 'block', margin: '0 auto 14px auto' }}
            />
            <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#1f2937', margin: 0 }}>
              {modeCopy[mode].title}
            </h1>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0', letterSpacing: '0.3px' }}>
              {modeCopy[mode].subtitle}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              color: '#15803d',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}>
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <>
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <LabeledIconField
                  label="Tên đăng nhập"
                  icon={<UserIcon size={16} style={fieldIconStyle} />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Nhập tên đăng nhập (email)"
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={fieldLabelStyle}>Mật khẩu</label>
                    <button type="button" onClick={() => goToMode('forgot')} style={{ background: 'none', border: 'none', color: '#b45309', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={16} style={fieldIconStyle} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      style={{ ...fieldInputStyle, paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: '#d97706', cursor: 'pointer' }}
                  />
                  Ghi nhớ đăng nhập
                </label>

                <button type="submit" disabled={loading} style={goldButtonStyle}>
                  {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>

              {/* Nút đăng nhập Lark */}
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                  <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>HOẶC</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                </div>
                
                <button
                  type="button"
                  onClick={redirectToLarkLogin}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    width: '100%',
                    padding: '6px 0',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '14.5px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '12px' }}>
                    <img 
                      src="https://p16-hera-overseas.larksuitecdn.com/tos-mya-i-lojyj5t9n9/f3f7b6969eb14364be035282e866b7bb.png~tplv-lojyj5t9n9-png:0:0.png" 
                      alt="Lark Logo" 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        objectFit: 'contain' 
                      }} 
                    />
                  </div>
                  <span>Đăng nhập qua Lark</span>
                  <div />
                </button>
              </div>

              <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#9ca3af', marginTop: '24px' }}>
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => goToMode('register')} style={{ background: 'none', border: 'none', color: '#b45309', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', padding: 0 }}>
                  Yêu cầu quyền truy cập
                </button>
              </p>
            </>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <LabeledIconField label="Họ Và Tên" icon={<UserIcon size={16} style={fieldIconStyle} />} value={name} onChange={setName} placeholder="Ví dụ: Nguyễn Văn A" />

              <LabeledIconField label="Email Công Việc" icon={<Mail size={16} style={fieldIconStyle} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <LabeledIconField
                label="Mật Khẩu (Khởi tạo)"
                icon={<Lock size={16} style={fieldIconStyle} />}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Nhập tối thiểu 6 ký tự"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Vai Trò Trong Hệ Thống</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={16} style={fieldIconStyle} />
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ ...fieldInputStyle, cursor: 'pointer' }}>
                    <option value="SALE">Chuyên Viên Kinh Doanh (SALE)</option>
                    <option value="ORDER">Chuyên Viên Báo Giá (ORDER)</option>
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ ...goldButtonStyle, marginTop: '4px' }}>
                <UserPlus size={18} />
                {loading ? 'Đang xử lý tạo tài khoản...' : 'Gửi Yêu Cầu Truy Cập'}
              </button>

              <button type="button" onClick={() => goToMode('login')} style={backLinkStyle}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: 0, textAlign: 'center' }}>
                Nhập email tài khoản của bạn. Hệ thống sẽ cấp mã xác thực OTP (6 chữ số) để đặt lại mật khẩu mới.
              </p>

              <LabeledIconField label="Email Đã Đăng Ký" icon={<Mail size={16} style={fieldIconStyle} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <button type="submit" disabled={loading} style={goldButtonStyle}>
                <KeyRound size={18} />
                {loading ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực OTP'}
              </button>

              <button type="button" onClick={() => goToMode('login')} style={backLinkStyle}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}

          {/* 4. RESET PASSWORD FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5', margin: 0, textAlign: 'center' }}>
                Nhập mã OTP 6 chữ số vừa nhận được và thiết lập mật khẩu mới của bạn.
              </p>

              <LabeledIconField label="Email" icon={<Mail size={16} style={fieldIconStyle} />} type="email" value={email} onChange={setEmail} placeholder="user@vcb.vn" />

              <LabeledIconField
                label="Mã Xác Thực OTP (6 chữ số)"
                icon={<KeyRound size={16} style={{ ...fieldIconStyle, color: '#d97706' }} />}
                value={otp}
                onChange={setOtp}
                maxLength={6}
                inputStyle={{ border: '1px solid #f0b429', color: '#92400e', fontWeight: 700, letterSpacing: '3px' }}
              />

              <LabeledIconField
                label="Mật Khẩu Mới"
                icon={<Lock size={16} style={fieldIconStyle} />}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Nhập tối thiểu 6 ký tự"
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...goldButtonStyle,
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  boxShadow: '0 6px 16px rgba(22, 163, 74, 0.35)',
                }}
              >
                <CheckCircle2 size={18} />
                {loading ? 'Đang cập nhật mật khẩu...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
              </button>

              <button type="button" onClick={() => goToMode('login')} style={backLinkStyle}>
                <ArrowLeft size={16} /> Quay lại trang đăng nhập
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
