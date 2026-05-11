import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "@/store/useApp";
import { canAccessRoute } from "@/lib/permissions";

/**
 * RF-50/52/54 — Bloquea por URL las rutas que no corresponden al rol.
 * Si el usuario no está autenticado, redirige a /login.
 */
export function RouteGuard() {
  const user = useCurrentUser();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessRoute(user.role, pathname)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
