import React from 'react';

interface NavProgressBarProps {
  show: boolean;
}

// Thanh tiến trình mỏng, không chặn thao tác — dùng khi chuyển tab / đổi bộ lọc.
// Chỉ hiện nếu load lâu hơn 150ms để tránh nháy.
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
    <div className="fixed top-0 left-0 right-0 h-[3px] bg-[rgba(37,99,235,0.12)] z-[10000] overflow-hidden">
      <div className="h-full w-[35%] rounded-r-[2px] bg-[linear-gradient(90deg,#2563eb,#60a5fa)] animate-nav-progress" />
    </div>
  );
};
