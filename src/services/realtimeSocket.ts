import { io, Socket } from 'socket.io-client';

// Kết nối socket realtime (cập nhật trạng thái + chat) tới backend. 1 socket/phiên, khởi tạo ở AppShell.
// Auth qua httpOnly cookie (withCredentials); origin backend suy từ VITE_API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const SOCKET_BASE_URL = API_BASE.replace(/\/api\/?$/, '');

export function connectRealtimeSocket(): Socket {
  return io(SOCKET_BASE_URL, {
    autoConnect: true,
    withCredentials: true,
    // Để mặc định polling -> websocket. Khi FE deploy sau proxy tĩnh (Vercel) không nâng cấp được
    // WS thì socket giữ ở long-polling qua rewrite '/socket.io/*'; nối thẳng backend thì tự lên WS.
    transports: ['polling', 'websocket'],
  });
}
