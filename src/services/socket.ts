import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';
const SOCKET_BASE_URL = API_BASE.replace(/\/api\/?$/, '');

export function connectChatSocket(): Socket {
  return io(SOCKET_BASE_URL, {
    // Đọc token "lazy" qua callback thay vì đóng băng 1 lần lúc tạo socket — mỗi lần
    // reconnect tự động (VD sau khi access token hết hạn 15 phút) sẽ đọc lại token mới nhất.
    auth: (cb) => cb({ token: getStoredToken() }),
    autoConnect: true,
    withCredentials: true,
  });
}
