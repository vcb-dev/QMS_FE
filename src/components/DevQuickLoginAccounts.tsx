import React from 'react';

/**
 * Bảng chọn nhanh tài khoản kiểm thử — CHỈ DÙNG TẠM THỜI cho môi trường dev/demo.
 * Khi lên production, xoá import + dòng <DevQuickLoginAccounts .../> trong LoginPage.tsx,
 * rồi xoá file này là xong — không đụng gì tới phần còn lại của trang đăng nhập.
 */

interface DevQuickLoginAccountsProps {
  currentEmail: string;
  onSelect: (email: string) => void;
}

const TEST_ACCOUNTS = [
  { label: 'Sale (Nguyễn Văn Sale)', email: 'sale@vcb.vn' },
  { label: 'Pricing (Trần Văn Pricing)', email: 'pricing@vcb.vn' },
  { label: 'Admin (Ban Giám Đốc)', email: 'admin@vcb.vn' },
];

export const DevQuickLoginAccounts: React.FC<DevQuickLoginAccountsProps> = ({ currentEmail, onSelect }) => {
  return (
    <div style={{ marginBottom: '18px' }}>
      <label style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
        Chọn tài khoản kiểm thử nhanh:
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {TEST_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onSelect(acc.email)}
            style={{
              background: currentEmail === acc.email ? '#fef3c7' : '#f9fafb',
              border: `1px solid ${currentEmail === acc.email ? '#d97706' : '#e5e7eb'}`,
              borderRadius: '10px',
              padding: '8px 12px',
              color: currentEmail === acc.email ? '#92400e' : '#4b5563',
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
  );
};
