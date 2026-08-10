import React, { useState } from 'react';
import type { User } from '../types';
import { loginApi, registerApi, forgotPasswordApi, resetPasswordApi } from '../services/api';
import { Lock, Mail, Shield, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2, User as UserIcon, Briefcase } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form states
  const [email, setEmail] = useState('sale@vcb.vn');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'SALE' | 'PRICING' | 'ADMIN'>('SALE');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const testAccounts = [
    { label: 'Sale (Nguyễn Văn Sale)', email: 'sale@vcb.vn' },
    { label: 'Pricing (Trần Văn Pricing)', email: 'pricing@vcb.vn' },
    { label: 'Admin (Ban Giám Đốc)', email: 'admin@vcb.vn' },
  ];

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập Email và Mật khẩu');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const data = await loginApi(email, password);
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
      setTimeout(() => {
        setMode('login');
        clearMessages();
      }, 3500);
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
      setTimeout(() => {
        setMode('reset');
      }, 1500);
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.25) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(217, 119, 6, 0.2) 0px, transparent 50%), #0f172a',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            boxShadow: '0 8px 20px rgba(217, 119, 6, 0.4)',
            marginBottom: '14px',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>VCB QMS System</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Hệ Thống Báo Giá Chế Tác Kim Hoàn
          </p>
        </div>

        {/* Mode Title & Navigation Bar */}
        <div style={{
          display: 'flex',
          background: '#0f172a',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid #334155',
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); clearMessages(); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: mode === 'login' ? '#2563eb' : 'transparent',
              color: mode === 'login' ? 'white' : '#94a3b8',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); clearMessages(); }}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: mode === 'register' ? '#2563eb' : 'transparent',
              color: mode === 'register' ? 'white' : '#94a3b8',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Đăng Ký
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
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
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            color: '#86efac',
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
            {/* Quick Test Accounts */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                Chọn tài khoản kiểm thử nhanh:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {testAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => selectAccount(acc.email)}
                    style={{
                      background: email === acc.email ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${email === acc.email ? '#2563eb' : '#334155'}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Email Đăng Nhập</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@vcb.vn"
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 38px',
                      color: 'white',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Mật Khẩu</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); clearMessages(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60a5fa',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '10px 12px 10px 38px',
                      color: 'white',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <LogIn size={18} />
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}
              </button>
            </form>
          </>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Họ Và Tên</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Email Công Việc</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vcb.vn"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Mật Khẩu (Khởi tạo)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập tối thiểu 6 ký tự"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Vai Trò Trong Hệ Thống</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Briefcase size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="SALE">Chuyên Viên Kinh Doanh (SALE)</option>
                  <option value="PRICING">Chuyên Viên Báo Giá (PRICING)</option>
                  <option value="ADMIN">Quản Trị Hệ Thống (ADMIN)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                width: '100%',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              }}
            >
              <UserPlus size={18} />
              {loading ? 'Đang xử lý tạo tài khoản...' : 'Tạo Tài Khoản Mới'}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
              Nhập email tài khoản của bạn. Hệ thống sẽ cấp mã xác thực OTP (6 chữ số) để đặt lại mật khẩu mới.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Email Đã Đăng Ký</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vcb.vn"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
              }}
            >
              <KeyRound size={18} />
              {loading ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực OTP'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); clearMessages(); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              <ArrowLeft size={16} /> Quay lại trang đăng nhập
            </button>
          </form>
        )}

        {/* 4. RESET PASSWORD FORM */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
              Nhập mã OTP 6 chữ số vừa nhận được và thiết lập mật khẩu mới của bạn.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Email</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vcb.vn"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Mã Xác Thực OTP (6 chữ số)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', color: '#d97706' }} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Ví dụ: 123456"
                  maxLength={6}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #d97706',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#fef3c7',
                    fontSize: '15px',
                    fontWeight: 700,
                    letterSpacing: '3px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Mật Khẩu Mới</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập tối thiểu 6 ký tự"
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                width: '100%',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
              }}
            >
              <CheckCircle2 size={18} />
              {loading ? 'Đang cập nhật mật khẩu...' : 'Xác Nhận Đặt Lại Mật Khẩu'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); clearMessages(); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              <ArrowLeft size={16} /> Quay lại trang đăng nhập
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
