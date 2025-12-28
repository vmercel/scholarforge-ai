import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AuthMe = RouterOutputs["auth"]["me"];

type AuthContextValue = {
  user: AuthMe;
  loading: boolean;
  error: unknown | null;
  isAuthenticated: boolean;
  refresh: () => Promise<unknown>;
  setUser: (user: AuthMe) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const setUser = useCallback(
    (user: AuthMe) => {
      utils.auth.me.setData(undefined, user);
    },
    [utils]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("manus-runtime-user-info", JSON.stringify(meQuery.data ?? null));
  }, [meQuery.data]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user: (meQuery.data ?? null) as AuthMe,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
      refresh: () => meQuery.refetch(),
      setUser,
      logout,
    };
  }, [
    logout,
    logoutMutation.error,
    logoutMutation.isPending,
    meQuery,
    setUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export function isUnauthedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    (error.data?.code === "UNAUTHORIZED" || error.message === UNAUTHED_ERR_MSG)
  );
}
