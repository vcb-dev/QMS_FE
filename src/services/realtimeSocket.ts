import { io, Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
// Socket nối THẲNG tới backend, không đi qua rewrite/proxy của host tĩnh (Vercel) — proxy đó
// chỉ chuyển tiếp HTTP, không nâng cấp được WebSocket nên socket.io kẹt ở long-polling.
// VITE_SOCKET_URL trỏ đúng origin backend (vd https://qms-be-production.up.railway.app);
// khi trống thì suy ra từ VITE_API_BASE (bỏ hậu tố /api), hợp với môi trường local same-origin.
const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api\/?$/, '');

// Cùng namespace gốc "/" với chat (RealtimeGateway giờ gộp cả 2) — chỉ khác vòng đời: cái này
// connect 1 lần lúc đăng nhập, sống suốt phiên (AppShell), không theo từng lần mở DetailPage.
// Không còn gửi token qua handshake.auth — JWT nằm trong httpOnly cookie (crmspd_at),
// withCredentials: true tự gửi kèm, RealtimeGateway đọc thẳng từ cookie khi auth.token trống.
export function connectRealtimeSocket(): Socket {
  return io(SOCKET_BASE_URL, {
    autoConnect: true,
    withCredentials: true,
    // Ép WebSocket, bỏ HTTP long-polling. Mặc định socket.io mở polling trước rồi mới nâng cấp;
    // nếu bước nâng cấp không xong (proxy/host) nó kẹt polling — mỗi poll là 1 request HTTP treo,
    // tab trình duyệt "load" không dứt. Railway hỗ trợ WebSocket sẵn nên nối thẳng.
    transports: ['websocket'],
  });
}
