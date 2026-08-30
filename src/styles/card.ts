export const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '16px',
  padding: '22px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
};

export const cardTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 800,
  color: '#0f172a',
  margin: '0 0 16px 0',
};

export const fieldLabelStyle: React.CSSProperties = { fontSize: '12.5px', fontWeight: 700, color: '#374151' };
export const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '11px 14px 11px 40px',
  color: '#111827',
  fontSize: '13.5px',
  outline: 'none',
};
export const fieldIconStyle: React.CSSProperties = { position: 'absolute', left: '13px', color: '#9ca3af' };

export const goldButtonStyle: React.CSSProperties = {
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

export const backLinkStyle: React.CSSProperties = {
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

// pricingConfig
export const PRIMARY_BLUE = '#2563eb';
export const PRIMARY_DARK = '#0f172a';

// ==========================
// Design tokens
// ==========================

export const labelStyle: React.CSSProperties = {
  fontSize: '10.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase',
  letterSpacing: '0.04em', display: 'block', marginBottom: '6px',
};

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
  fontSize: '12.5px', fontWeight: 800, color: '#0f172a', outline: 'none',
};

// Box-model giống hệt inputStyle (cùng padding/viền, viền trong suốt) — bọc span chế độ xem để
// chữ đứng yên đúng vị trí X/Y khi chuyển qua lại giữa xem và sửa, không bị "nhảy" do input có
// padding/viền còn span trơn thì không.
export const valueBoxStyle: React.CSSProperties = {
  display: 'inline-block', padding: '8px 10px', border: '1px solid transparent',
  borderRadius: '8px', boxSizing: 'border-box',
};

export const suffixStyle: React.CSSProperties = {
  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
  fontSize: '11px', fontWeight: 700, color: '#94a3b8', pointerEvents: 'none',
};

export const fieldErrorStyle: React.CSSProperties = { fontSize: '10.5px', color: '#dc2626', fontWeight: 700 };

// Đồng bộ với nút .primary-action / .fb-btn của trang Danh Sách Yêu Cầu — tông xám đơn sắc,
// không dùng nền tối/xanh cho nút hành động.
export const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
  background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#334155',
  fontSize: '12.5px', fontWeight: 800, padding: '9px 18px', cursor: 'pointer',
};

export const btnSecondaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff',
  border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px',
  fontSize: '12.5px', fontWeight: 700, color: '#334155', cursor: 'pointer',
};

export const btnGhostSmallStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent',
  border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px',
  fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer',
};

export const iconBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px',
};

export const pageBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff',
  fontSize: '11.5px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
});

export const thStyle: React.CSSProperties = { padding: '8px 6px', textAlign: 'left' };
// minHeight/verticalAlign giữ chiều cao dòng cố định giữa 2 chế độ xem (span) và sửa (input) —
// input cao hơn span (~34px vs ~18px) nên nếu không giữ cố định, bấm sửa làm cả bảng phình ra,
// đẩy nội dung bên dưới dịch xuống dưới con trỏ chuột, khiến lần bấm tiếp theo trúng nhầm dòng khác.
export const tdStyle: React.CSSProperties = { padding: '10px 6px', minHeight: '38px', verticalAlign: 'middle' };
export const tdCenterStyle: React.CSSProperties = { padding: '10px 6px', textAlign: 'center', minHeight: '38px', verticalAlign: 'middle' };
export const tableHeadRowStyle: React.CSSProperties = { color: '#94a3b8', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' };
