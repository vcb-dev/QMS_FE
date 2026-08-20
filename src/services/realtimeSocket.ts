import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const SOCKET_BASE_URL = API_BASE.replace(/\/api\/?$/, '');

// Cùng namespace gốc "/" với chat (RealtimeGateway giờ gộp cả 2) — chỉ khác vòng đời: cái này
// connect 1 lần lúc đăng nhập, sống suốt phiên (AppShell), không theo từng lần mở DetailPage.
export function connectRealtimeSocket(): Socket {
  return io(SOCKET_BASE_URL, {
    auth: (cb) => cb({ token: getStoredToken() }),
    autoConnect: true,
    withCredentials: true,
  });
}
