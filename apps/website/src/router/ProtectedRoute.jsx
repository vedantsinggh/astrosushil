import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  if (!authInitialized) return null;
  return isAuthenticated ? <Outlet /> : <Navigate to="/register/" replace />;
}
