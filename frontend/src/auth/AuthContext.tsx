import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import type { CurrentUser } from "@/api/types";

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUser | null) => void;
}

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refresh = React.useCallback(async () => {
    try {
      const data = await api.get<CurrentUser>("/api/user");
      setUser(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/logout", { credentials: "include" });
    } catch {
      // ignore network errors during logout
    }
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for global auth errors triggered by hooks.
  React.useEffect(() => {
    function onUnauthorized() {
      setUser(null);
      const here = location.pathname + location.search;
      if (
        location.pathname !== "/login" &&
        location.pathname !== "/register"
      ) {
        navigate(`/login?next=${encodeURIComponent(here)}`, { replace: true });
      }
    }
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [location.pathname, location.search, navigate]);

  const value = React.useMemo<AuthState>(
    () => ({
      user,
      loading,
      isAdmin: user?.roleId === 2,
      refresh,
      logout,
      setUser,
    }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
