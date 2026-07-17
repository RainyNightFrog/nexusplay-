"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "@/i18n/navigation";
import type { UserProfile } from "@/lib/auth";
import { profileFromUserMetadata } from "@/lib/profile-from-metadata";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import {
  clearProfileSessionCache,
  readProfileSessionCache,
  writeProfileSessionCache,
} from "@/lib/profile-session-cache";
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

const PROFILE_FETCH_TIMEOUT_MS = 10_000;

function isAuthRoute(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const hasResolvedOnce = useRef(false);
  const loadGeneration = useRef(0);

  const finishInitialLoad = useCallback(() => {
    setLoading(false);
    hasResolvedOnce.current = true;
  }, []);

  const loadProfile = useCallback(
    async (options?: { silent?: boolean }) => {
      const generation = ++loadGeneration.current;
      const silent = options?.silent ?? hasResolvedOnce.current;

      if (!silent && !hasResolvedOnce.current) {
        setLoading(true);
      }

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (generation !== loadGeneration.current) return;

        if (!session?.user) {
          setProfile(null);
          clearProfileSessionCache();
          return;
        }

        const user = session.user;
        const cachedProfile = readProfileSessionCache();
        if (cachedProfile?.id === user.id) {
          setProfile(cachedProfile);
        } else {
          setProfile(profileFromUserMetadata(user));
        }

        if (!silent) {
          finishInitialLoad();
        }

        const response = await fetchWithTimeout(
          "/api/auth/profile",
          { credentials: "same-origin" },
          PROFILE_FETCH_TIMEOUT_MS
        );
        if (generation !== loadGeneration.current) return;

        if (response.ok) {
          const data = (await response.json()) as { profile?: UserProfile | null };
          const nextProfile = data.profile ?? profileFromUserMetadata(user);
          setProfile(nextProfile);
          writeProfileSessionCache(nextProfile);
        } else if (!cachedProfile || cachedProfile.id !== user.id) {
          const fallback = profileFromUserMetadata(user);
          setProfile(fallback);
          writeProfileSessionCache(fallback);
        }
      } catch {
        // 保留 session / 快取 / metadata 的暫時 profile，避免刷新卡住
      } finally {
        if (generation === loadGeneration.current) {
          finishInitialLoad();
        }
      }
    },
    [finishInitialLoad]
  );

  useLayoutEffect(() => {
    if (isAuthRoute(pathname)) {
      finishInitialLoad();
      return;
    }

    const cachedProfile = readProfileSessionCache();
    if (cachedProfile) {
      setProfile(cachedProfile);
      finishInitialLoad();
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;

        if (!session?.user) {
          setProfile(null);
          finishInitialLoad();
          return;
        }

        setProfile(profileFromUserMetadata(session.user));
        finishInitialLoad();
      })
      .catch(() => {
        if (cancelled) return;
        finishInitialLoad();
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, finishInitialLoad]);

  useEffect(() => {
    if (isAuthRoute(pathname)) {
      return;
    }

    void loadProfile({ silent: hasResolvedOnce.current });

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        clearProfileSessionCache();
        finishInitialLoad();
        return;
      }

      void loadProfile({
        silent:
          event === "TOKEN_REFRESHED" ||
          (hasResolvedOnce.current && event !== "SIGNED_IN"),
      });
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, pathname, finishInitialLoad]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    clearProfileSessionCache();
    finishInitialLoad();
    window.location.href = "/";
  }, [finishInitialLoad]);

  const refreshProfile = useCallback(async () => {
    await loadProfile({ silent: true });
  }, [loadProfile]);

  useEffect(() => {
    if (!profile?.supporter_lifetime || isAuthRoute(pathname)) {
      return;
    }

    const key = `rnf-lifetime-online:${profile.id}`;
    try {
      if (sessionStorage.getItem(key) === "1") {
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage 不可用時仍嘗試廣播（伺服器有冷卻）
    }

    void fetch("/api/supporter/lifetime-online", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
  }, [profile?.id, profile?.supporter_lifetime, pathname]);

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
