import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jwtDecode } from "jwt-decode";
import { api, registerUnauthorizedHandler } from "@/lib/api";
import { getStoredToken, setStoredToken, clearStoredToken } from "@/lib/authStorage";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Called by LoginPage/RegisterPage's own mutations on success. */
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<{ user: AuthUser }>("/me"),
    enabled: !!token,
    retry: false,
  });

  function endSession() {
    clearStoredToken();
    setToken(null);
    queryClient.clear();
  }

  function logout() {
    endSession();
    navigate("/login", { replace: true });
  }

  // A 401 from any request (expired/invalid token) bounces back to
  // /login — registered once so every api.ts call site gets this for free
  // instead of handling it individually.
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      endSession();
      navigate("/login", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Proactive expiry: the backend signs an 8h token with a real `exp`
  // claim — decode it and log out the moment it lapses, rather than
  // waiting for the user to trigger a request that 401s.
  useEffect(() => {
    if (!token) return;
    let exp: number;
    try {
      exp = jwtDecode<{ exp: number }>(token).exp;
    } catch {
      // Malformed token (e.g. hand-edited in localStorage) — same outcome
      // as an already-expired one below.
      endSession();
      navigate("/login", { replace: true });
      return;
    }
    const msUntilExpiry = exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      endSession();
      navigate("/login", { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      endSession();
      navigate("/login", { replace: true });
    }, msUntilExpiry);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function setSession(newToken: string, user: AuthUser) {
    setStoredToken(newToken);
    setToken(newToken);
    queryClient.setQueryData(["me"], { user });
  }

  const value: AuthContextValue = {
    user: meQuery.data?.user ?? null,
    isLoading: !!token && meQuery.isPending,
    isAuthenticated: !!token && !!meQuery.data?.user,
    setSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
