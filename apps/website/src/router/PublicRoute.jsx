import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  if (!authInitialized) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
