import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { LoginPage as LoginPageComponent } from '../components/LoginPage';

interface LoginPageProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ currentUser, onLoginSuccess }) => {
  const navigate = useNavigate();

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleSuccess = (user: User) => {
    onLoginSuccess(user);
    navigate('/', { replace: true });
  };

  return <LoginPageComponent onLoginSuccess={handleSuccess} />;
};
