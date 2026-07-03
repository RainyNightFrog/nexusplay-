"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/auth";

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setProfile(null);
          return;
        }

        const response = await fetch("/api/auth/profile");
        if (response.ok) {
          const data = (await response.json()) as { profile?: UserProfile };
          setProfile(data.profile ?? null);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      loadProfile();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    window.location.href = "/";
  }

  async function refreshProfile() {
    try {
      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const data = (await response.json()) as { profile?: UserProfile };
        setProfile(data.profile ?? null);
      }
    } catch {
      // ignore
    }
  }

  return { profile, loading, signOut, refreshProfile, isCreator: profile?.role === "creator" };
}
