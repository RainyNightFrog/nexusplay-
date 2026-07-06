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
import type { UserProfile } from "@/lib/auth";
import { profileFromUserMetadata } from "@/lib/profile-from-metadata";
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

      const response = await fetch("/api/auth/profile", {
        credentials: "same-origin",
      });
      if (generation !== loadGeneration.current) return;

      if (response.ok) {
        const data = (await response.json()) as { profile?: UserProfile | null };
        setProfile(data.profile ?? profileFromUserMetadata(user));
      } else {
        setProfile(profileFromUserMetadata(user));
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
      if (event === "SIGNED_OUT") {
        setProfile(null);
        hasResolvedOnce.current = true;
        setLoading(false);
        return;
      }

      void loadProfile({
        silent:
          event === "TOKEN_REFRESHED" ||
          (hasResolvedOnce.current && event !== "SIGNED_IN"),
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
      isCreator: profile?.role === "creator" || profile?.is_admin === true,
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
