import { getLoginUrl } from "@/const";
import { useAuthContext } from "@/contexts/AuthContext";
import { useEffect } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const state = useAuthContext();

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    try {
      const redirect = new URL(redirectPath, window.location.origin);
      if (window.location.pathname === redirect.pathname) return;
    } catch {
      // ignore invalid redirectPath
    }

    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    refresh: state.refresh,
    logout: state.logout,
    setUser: state.setUser,
  };
}
