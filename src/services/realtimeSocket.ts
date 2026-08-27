import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE ;
const SOCKET_BASE_URL = API_BASE.replace(/\/api\/?$/, '');

// Cùng namespace gốc "/" với chat (RealtimeGateway giờ gộp cả 2) — chỉ khác vòng đời: cái này
// connect 1 lần lúc đăng nhập, sống suốt phiên (AppShell), không theo từng lần mở DetailPage.
// Không còn gửi token qua handshake.auth — JWT nằm trong httpOnly cookie (crmspd_at),
// withCredentials: true tự gửi kèm, RealtimeGateway đọc thẳng từ cookie khi auth.token trống.
export function connectRealtimeSocket(): Socket {
  return io(SOCKET_BASE_URL, {
    autoConnect: true,
    withCredentials: true,
  });
}
