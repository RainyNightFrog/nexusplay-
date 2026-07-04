"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  profile: UserProfile | null;
  /** True only on the first auth resolution; background refreshes stay false. */
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isCreator: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function shouldRefreshSilently(
  event: AuthChangeEvent,
  hasResolvedOnce: boolean
): boolean {
  if (event === "TOKEN_REFRESHED") return true;
  if (event === "INITIAL_SESSION" && hasResolvedOnce) return true;
  if (event === "USER_UPDATED" && hasResolvedOnce) return true;
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasResolvedOnce = useRef(false);
  const loadGeneration = useRef(0);

  const loadProfile = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? hasResolvedOnce.current;
    const generation = ++loadGeneration.current;

    if (!silent) {
      setLoading(true);
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (generation !== loadGeneration.current) return;

      if (!user) {
        setProfile(null);
        return;
      }

      const response = await fetch("/api/auth/profile");
      if (generation !== loadGeneration.current) return;

      if (response.ok) {
        const data = (await response.json()) as { profile?: UserProfile };
        setProfile(data.profile ?? null);
      } else {
        setProfile(null);
      }
    } catch {
      if (generation === loadGeneration.current) {
        setProfile(null);
      }
    } finally {
      if (generation === loadGeneration.current) {
        setLoading(false);
        hasResolvedOnce.current = true;
      }
    }
  }, []);

  useEffect(() => {
    void loadProfile({ silent: false });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION") return;

      void loadProfile({
        silent: shouldRefreshSilently(event, hasResolvedOnce.current),
      });
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    hasResolvedOnce.current = true;
    setLoading(false);
    window.location.href = "/";
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile({ silent: true });
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      signOut,
      refreshProfile,
      isCreator: profile?.role === "creator",
      isAdmin: profile?.is_admin === true,
    }),
    [profile, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
