import React, { useState } from 'react';
import type { User } from '../types';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi } from '../services/api';
import {
  Lock, Mail, UserPlus, KeyRound, ArrowLeft, ArrowRight, CheckCircle2,
  User as UserIcon, Briefcase, Eye, EyeOff,
} from 'lucide-react';
import { DevQuickLoginAccounts } from './DevQuickLoginAccounts';

const COMPANY_LOGO_URL = 'https://vienchibao.com/wp-content/uploads/2025/01/logo.png';
// Ảnh vuông (1024x1024) — đặt trong public/ nên tham chiếu thẳng qua URL gốc, không import qua src/assets
const BACKGROUND_IMAGE_URL = '/screen.png';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

// Style dùng chung cho input trên nền thẻ sáng màu
const fieldLabelStyle: React.CSSProperties = { fontSize: '12.5px', fontWeight: 700, color: '#374151' };
const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '11px 14px 11px 40px',
  color: '#111827',
  fontSize: '13.5px',
  outline: 'none',
};
const fieldIconStyle: React.CSSProperties = { position: 'absolute', left: '13px', color: '#9ca3af' };

const goldButtonStyle: React.CSSProperties = {
  width: '100%',
  background: 'linear-gradient(135deg, #f0b429 0%, #d97706 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  padding: '13px',
  fontSize: '14.5px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 6px 16px rgba(217, 119, 6, 0.35)',
};

const backLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9ca3af',
  fontSize: '13px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontWeight: 600,
  marginTop: '4px',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('sale@vcb.vn');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'SALE' | 'PRICING' | 'ADMIN'>('SALE');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      onLoginSuccess(data.user, data.accessToken);
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

  const selectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('123456');
    clearMessages();
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
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: `linear-gradient(rgba(10, 15, 30, 0.35), rgba(10, 15, 30, 0.55)), url(${BACKGROUND_IMAGE_URL})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center 35%',
      backgroundRepeat: 'no-repeat',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: '#fffdf9',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Thanh vàng thương hiệu trên cùng */}
        <div style={{ height: '5px', background: 'linear-gradient(90deg, #fde68a, #f0b429, #b45309)' }} />

        <div style={{ padding: '32px 36px 36px' }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <img
              src={COMPANY_LOGO_URL}
              alt="Viễn Chí Bảo"
              style={{ height: '52px', objectFit: 'contain', marginBottom: '14px' }}
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
              {/* Chọn tài khoản kiểm thử nhanh — tạm thời cho dev/demo, xem DevQuickLoginAccounts.tsx để gỡ bỏ sau này */}
              <DevQuickLoginAccounts currentEmail={email} onSelect={selectAccount} />

              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={fieldLabelStyle}>Tên đăng nhập</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <UserIcon size={16} style={fieldIconStyle} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập tên đăng nhập (email)"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

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

              <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#9ca3af', marginTop: '20px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Họ Và Tên</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <UserIcon size={16} style={fieldIconStyle} />
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Nguyễn Văn A" style={fieldInputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Email Công Việc</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={fieldIconStyle} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@vcb.vn" style={fieldInputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Mật Khẩu (Khởi tạo)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={fieldIconStyle} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập tối thiểu 6 ký tự" style={fieldInputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Vai Trò Trong Hệ Thống</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={16} style={fieldIconStyle} />
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ ...fieldInputStyle, cursor: 'pointer' }}>
                    <option value="SALE">Chuyên Viên Kinh Doanh (SALE)</option>
                    <option value="PRICING">Chuyên Viên Báo Giá (PRICING)</option>
                    <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Email Đã Đăng Ký</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={fieldIconStyle} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@vcb.vn" style={fieldInputStyle} />
                </div>
              </div>

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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Email</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={fieldIconStyle} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@vcb.vn" style={fieldInputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Mã Xác Thực OTP (6 chữ số)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <KeyRound size={16} style={{ ...fieldIconStyle, color: '#d97706' }} />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Ví dụ: 123456"
                    maxLength={6}
                    style={{ ...fieldInputStyle, border: '1px solid #f0b429', color: '#92400e', fontWeight: 700, letterSpacing: '3px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={fieldLabelStyle}>Mật Khẩu Mới</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={fieldIconStyle} />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nhập tối thiểu 6 ký tự" style={fieldInputStyle} />
                </div>
              </div>

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
