import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.user_metadata?.role === "admin";
}

async function isAdminInDatabase(userId: string): Promise<boolean> {
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

  const metadataAdmin = isAdminUser(user);
  const dbAdmin = await isAdminInDatabase(user.id);

  if (!metadataAdmin && !dbAdmin) {
    return {
      error: NextResponse.json({ error: "需要超級管理員權限" }, { status: 403 }),
      supabase: null,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
