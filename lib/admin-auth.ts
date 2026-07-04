import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.user_metadata?.role === "admin";
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

  if (!isAdminUser(user)) {
    return {
      error: NextResponse.json({ error: "需要超級管理員權限" }, { status: 403 }),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
