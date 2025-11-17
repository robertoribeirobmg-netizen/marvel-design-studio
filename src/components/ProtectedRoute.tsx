import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  adminObrasOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false, adminObrasOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin, isAdminObras, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login');
      } else if (adminOnly && !isAdmin) {
        navigate('/area-cooperado');
      } else if (adminObrasOnly && !isAdminObras && !isAdmin) {
        navigate('/area-cooperado');
      }
    }
  }, [user, isAdmin, isAdminObras, isLoading, adminOnly, adminObrasOnly, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (adminOnly && !isAdmin) || (adminObrasOnly && !isAdminObras && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
}
