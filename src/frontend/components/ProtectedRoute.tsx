import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// DEV MODE: 禁用登录验证，直接放行
const DISABLE_AUTH = import.meta.env.DEV || true;

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // DEV MODE: 跳过登录验证
  if (DISABLE_AUTH) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
