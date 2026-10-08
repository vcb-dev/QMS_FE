import React, { useState } from 'react';
import clsx from 'clsx';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

// "Nguyen Van A" -> "NA".
function initialsOf(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar tròn dùng chung. Lark trả avatar_url trên feishucdn — referrerPolicy="no-referrer"
// để né chặn hotlink. Không có src / ảnh lỗi -> fallback về 2 chữ cái đầu tên.
export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = 34,
  background = '#0f172a',
  className,
  style,
}) => {
  // Nhớ URL đã lỗi (không phải cờ chung) để đổi sang ảnh khác — VD vừa tải ảnh đại diện mới — thì
  // tự thử lại thay vì kẹt ở chữ cái đầu tên.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImg = !!src && failedSrc !== src;

  return (
    <div
      className={clsx("rounded-full text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0", className)}
      /* động — giữ inline */
      style={{
        width: size,
        height: size,
        background,
        fontSize: Math.round(size * 0.38),
        ...style,
      }}
    >
      {showImg ? (
        <img
          src={src as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src as string)}
          className="w-full h-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
};
