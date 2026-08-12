import { useState } from 'react';
import type { Role, User } from '../types';
import { getStoredUser, logoutApi } from '../services/api';
import { LoginPage } from '../components/LoginPage';

interface AuthState {
  currentUser: User | null;
  currentRole: Role;
  handleLoginSuccess: (user: User) => void;
  handleLogout: () => Promise<void>;
  setCurrentRole: (role: Role) => void;
}

export function useAuth(): AuthState {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
  const [currentRole, setCurrentRole] = useState<Role>(getStoredUser()?.role || 'SALE');

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
  };

  return { currentUser, currentRole, handleLoginSuccess, handleLogout, setCurrentRole };
}

interface AuthGateProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  children: React.ReactNode;
}

export function AuthGate({ currentUser, onLoginSuccess, children }: AuthGateProps) {
  if (!currentUser) {
    return <LoginPage onLoginSuccess={onLoginSuccess} />;
  }
  return <>{children}</>;
}
