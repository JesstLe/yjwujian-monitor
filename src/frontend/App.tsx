import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Dashboard from "./components/Dashboard";
import SearchPanel from "./components/SearchPanel";
import Watchlist from "./components/Watchlist";
import Settings from "./components/Settings";
import ItemDetail from "./components/ItemDetail";
import ComparePage from "./components/ComparePage";
import Compare3DPage from "./components/Compare3DPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import VerifyEmailPage from "./components/VerifyEmailPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LayoutWrapper } from "./components/LayoutWrapper";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPanel />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/compare/3d" element={<Compare3DPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
