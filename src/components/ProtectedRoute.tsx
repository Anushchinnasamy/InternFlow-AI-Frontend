import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/roles";

interface ProtectedRouteProps {
  allowedRoles: readonly Role[];
  children: ReactNode;
}

// UX-only gate — mirrors the backend's permission matrix so the right nav
// items/pages show up, but the actual security boundary is server-side
// (every backend route re-checks the role itself; see CLAUDE.md rule 2).
// A user could edit this file to render anything and it would still 403
// from the API the moment they tried to act on it.
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
