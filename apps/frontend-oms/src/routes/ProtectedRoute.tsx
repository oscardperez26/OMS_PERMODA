import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Permission, Role } from '../auth/auth.types';

type Props = {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermissions?: Permission[];
  loginPath: string;
};

/**
 * ProtectedRoute
 * --------------
 * Reutilizable para panel y tienda en el mismo frontend:
 * - valida sesión activa
 * - valida rol permitido
 * - valida permisos puntuales cuando aplique
 */
export function ProtectedRoute({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  loginPath,
}: Props) {
  const { user, isLoading, hasRole, hasPermissions } = useAuth();

  if (isLoading) {
    return <div>Cargando sesion...</div>;
  }

  if (!user) {
    return <Navigate to={loginPath} replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to={loginPath} replace />;
  }

  if (requiredPermissions.length > 0 && !hasPermissions(requiredPermissions)) {
    return <Navigate to={loginPath} replace />;
  }

  return <>{children}</>;
}
