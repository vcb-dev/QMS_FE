import React, { useState } from 'react';
import type { User } from '../types';
import { loginApi } from '../services/api';
import { Lock, Mail, Shield, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('sale@vcb.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const testAccounts = [
    { label: '👤 Sale 1 (Nguyễn Văn Sale)', email: 'sale@vcb.vn' },
    { label: '💎 Pricing 1 (Trần Văn Pricing)', email: 'pricing1@vcb.vn' },
    { label: '⚙️ Admin (Ban Giám Đốc)', email: 'admin@vcb.vn' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập Email và Mật khẩu');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const data = await loginApi(email, password);
      onLoginSuccess(data.user, data.accessToken);
    } catch (err: any) {
      setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác');
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('123456');
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
        maxWidth: '440px',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white',
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Email Đăng Nhập</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@qms.com"
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
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#cbd5e1' }}>Mật Khẩu</label>
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
              transition: 'transform 0.15s ease',
            }}
          >
            <LogIn size={18} />
            {loading ? 'Đang xác thực...' : 'Đăng Nhập Hệ Thống'}
          </button>
        </form>
      </div>
    </div>
  );
};
