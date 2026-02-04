import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
  allowedRole: "ADMIN" | "STORE";
};

export function ProtectedRoute({ children, allowedRole }: Props) {
  const role = localStorage.getItem("role");

  // No autenticado -> redirige al login correspondiente
  if (!role) {
    // redirige al login según el allowedRole
    return <Navigate to={allowedRole === "ADMIN" ? "/panel/login" : "/tienda/login"} replace />;
  }

  // Role no autorizado -> limpiar y redirigir al login correspondiente
  if (role !== allowedRole) {
    localStorage.removeItem("role");
    return <Navigate to={allowedRole === "ADMIN" ? "/panel/login" : "/tienda/login"} replace />;
  }

  return <>{children}</>;
}
