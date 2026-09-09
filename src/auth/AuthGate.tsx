import { useEffect, useState } from 'react';
import type { Role, User } from '../types';
import { getStoredUser, getProfileApi, logoutApi, setSessionExpiredHandler } from '../services/api';

interface AuthState {
  currentUser: User | null;
  currentRole: Role;
  authLoading: boolean;
  handleLoginSuccess: (user: User) => void;
  handleLogout: () => Promise<void>;
  setCurrentRole: (role: Role) => void;
}

export function useAuth(): AuthState {
  const stored = getStoredUser();
  const [currentUser, setCurrentUser] = useState<User | null>(stored);
  const [currentRole, setCurrentRole] = useState<Role>(stored?.role || 'SALE');
  const [authLoading, setAuthLoading] = useState(true);

  // Nguồn sự thật của phiên là cookie httpOnly, không phải localStorage. Lúc mount xác thực
  // lại bằng /auth/profile — vá được login Lark (callback chỉ set cookie rồi redirect).
  useEffect(() => {
    let alive = true;
    getProfileApi().then((user) => {
      if (!alive) return;
      setCurrentUser(user);
      if (user) setCurrentRole(user.role);
      setAuthLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Phiên hết hạn hẳn (401 và refresh token cũng fail): api interceptor gọi handler này để về
  // màn đăng nhập bằng điều hướng SPA (xoá currentUser -> App render <Navigate to="/login">),
  // thay cho window.location.reload() vốn chớp trắng và mất state form đang nhập.
  useEffect(() => {
    setSessionExpiredHandler(() => setCurrentUser(null));
    return () => setSessionExpiredHandler(null);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
  };

  return { currentUser, currentRole, authLoading, handleLoginSuccess, handleLogout, setCurrentRole };
}
