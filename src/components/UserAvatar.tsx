import React, { useState } from 'react';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  background?: string;
  style?: React.CSSProperties;
}

// "Nguyen Van A" -> "NA" (giống getInitials cũ trong Header).
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
  style,
}) => {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background,
        color: '#ffffff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.38),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {showImg ? (
        <img
          src={src as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
};
