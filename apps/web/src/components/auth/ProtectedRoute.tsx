import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
  requireStoreBinding?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requireStoreBinding = false,
}) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // Enquanto carrega a sessão a partir do token, não renderiza conteúdo protegido
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-xs">
          <div className="w-7 h-7 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="font-medium">Validando permissões de acesso...</span>
        </div>
      </div>
    );
  }

  // Não autenticado: redireciona para login preservando o destino solicitado
  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Verifica papel permitido
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toUpperCase();
    const hasRole = allowedRoles.some((r) => r.toUpperCase() === userRole);

    if (!hasRole) {
      return (
        <Navigate
          to="/acesso-negado"
          state={{ from: location.pathname, userRole: user.role }}
          replace
        />
      );
    }
  }

  // Se exigir vínculo de loja (para STORE_ADMIN):
  if (requireStoreBinding && user.role === 'STORE_ADMIN' && !user.store_id) {
    return (
      <Navigate
        to="/acesso-negado"
        state={{
          from: location.pathname,
          userRole: user.role,
          reason: 'STORE_UNASSIGNED',
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};
