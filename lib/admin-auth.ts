import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * 僅信任 service role 可寫的 app_metadata（客戶端無法偽造）。
 * 一般管理員請以 profiles.is_admin 為準。
 */
export function isServiceAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.app_metadata?.role === "admin";
}

/**
 * @deprecated 不可再信 user_metadata.role。保留別名以免舊 import 斷裂，行為等同 isServiceAdminUser。
 */
export function isAdminUser(user: User | null | undefined): boolean {
  return isServiceAdminUser(user);
}

export async function isAdminInDatabase(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error) return false;
    return data?.is_admin === true;
  } catch {
    return false;
  }
}

export async function resolveAdminAccess(
  user: User | null | undefined,
  supabase?: SupabaseClient
): Promise<boolean> {
  if (!user) return false;
  if (isServiceAdminUser(user)) return true;

  if (supabase) {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data?.is_admin === true) {
      return true;
    }
    return false;
  }

  return isAdminInDatabase(user.id);
}

export async function requireAdmin() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "請先登入" }, { status: 401 }),
      supabase: null,
      user: null,
    };
  }

  const allowed = await resolveAdminAccess(user);
  if (!allowed) {
    return {
      error: NextResponse.json({ error: "需要超級管理員權限" }, { status: 403 }),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
