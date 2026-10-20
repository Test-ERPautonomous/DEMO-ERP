import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from './LoginPage';
import { UserRole } from '../../types';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: (UserRole | string)[];
  onNavigate: (route: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
}) => {
  return <>{children}</>;
};

