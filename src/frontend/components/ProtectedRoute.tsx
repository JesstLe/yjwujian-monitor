import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * 本地模式：默认启用，无需登录即可使用所有功能。
 * 设置环境变量 VITE_LOCAL_MODE=false 可切换为云端登录模式。
 */
const LOCAL_MODE = import.meta.env.VITE_LOCAL_MODE !== "false";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 本地模式：跳过登录验证，直接放行
  if (LOCAL_MODE) {
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
