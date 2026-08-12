import React from 'react';

interface NavProgressBarProps {
  show: boolean;
}

// Thanh tiến trình mỏng, không chặn thao tác — dùng khi chuyển tab / đổi bộ lọc,
// thay cho overlay che toàn màn hình. Chỉ hiện nếu load lâu hơn 150ms để tránh nháy.
export const NavProgressBar: React.FC<NavProgressBarProps> = ({ show }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="nav-progress-bar">
      <div className="nav-progress-bar-fill" />
    </div>
  );
};
