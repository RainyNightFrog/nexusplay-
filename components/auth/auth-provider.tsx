"use client";

import type { User } from "@supabase/supabase-js";
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

      let sessionUser: User | null = null;

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
        sessionUser = user;
        const cachedProfile = readProfileSessionCache();
        // 有快取才樂觀顯示；無快取時勿用 user_metadata.avatar_url（Google 登入常寫在這），
        // 否則會在 /api/auth/profile 回來前短暫閃出錯誤頭像。
        if (cachedProfile?.id === user.id) {
          setProfile(cachedProfile);
          if (!silent) {
            finishInitialLoad();
          }
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
          setProfile((prev) => {
            if (prev?.id === user.id) return prev;
            const fallback = profileFromUserMetadata(user);
            writeProfileSessionCache(fallback);
            return fallback;
          });
        }
      } catch {
        // 網路失敗：保留既有／快取；完全沒資料時才退回 metadata（可能含 Google）
        const cachedProfile = readProfileSessionCache();
        setProfile((prev) => {
          if (prev) return prev;
          if (cachedProfile) return cachedProfile;
          if (sessionUser) return profileFromUserMetadata(sessionUser);
          return prev;
        });
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

        // 已登入但無快取：維持 loading，交給 loadProfile 等 DB profile，
        // 避免先畫出 Google OAuth 的 user_metadata 頭像。
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
    const isPremiumOnlineEligible =
      profile?.supporter_lifetime === true ||
      (profile?.is_supporter === true &&
        profile?.supporter_badge === "supporter_v2");

    if (!profile || !isPremiumOnlineEligible || isAuthRoute(pathname)) {
      return;
    }

    const key = `rnf-premium-online:${profile.id}`;
    const cooldownMs = 4 * 60 * 60 * 1000; // 須與伺服器 LIFETIME_ONLINE_ANNOUNCE_COOLDOWN_MS 一致
    try {
      const lastRaw = sessionStorage.getItem(key);
      const lastAt = lastRaw ? Number(lastRaw) : 0;
      if (Number.isFinite(lastAt) && Date.now() - lastAt < cooldownMs) {
        return;
      }
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // sessionStorage 不可用時仍嘗試廣播（伺服器有冷卻）
    }

    void fetch("/api/supporter/lifetime-online", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
  }, [
    profile?.id,
    profile?.is_supporter,
    profile?.supporter_badge,
    profile?.supporter_lifetime,
    pathname,
  ]);

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
