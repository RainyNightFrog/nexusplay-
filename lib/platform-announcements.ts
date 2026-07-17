import { createServerSupabase } from "@/lib/supabase-server";

export type PlatformAnnouncement = {
  id: string;
  message: string;
  href: string | null;
  severity: "info" | "warning" | "success";
};

export async function getActivePlatformAnnouncements(): Promise<
  PlatformAnnouncement[]
> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("platform_announcements")
    .select("id, message, href, severity, starts_at, ends_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(error.message);

  const now = Date.now();
  return (data ?? [])
    .filter((row) => {
      if (row.starts_at && new Date(row.starts_at).getTime() > now) {
        return false;
      }
      if (row.ends_at && new Date(row.ends_at).getTime() < now) {
        return false;
      }
      return true;
    })
    .slice(0, 3)
    .map((row) => ({
      id: row.id,
      message: row.message,
      href: row.href,
      severity: row.severity as PlatformAnnouncement["severity"],
    }));
}

export async function listAllPlatformAnnouncements() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("platform_announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPlatformAnnouncement(input: {
  message: string;
  href?: string | null;
  severity?: "info" | "warning" | "success";
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("platform_announcements")
    .insert({
      message: input.message.trim(),
      href: input.href?.trim() || null,
      severity: input.severity ?? "info",
      active: input.active ?? true,
      starts_at: input.startsAt?.trim() || null,
      ends_at: input.endsAt?.trim() || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deactivatePlatformAnnouncement(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("platform_announcements")
    .update({ active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function reactivatePlatformAnnouncement(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("platform_announcements")
    .update({ active: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updatePlatformAnnouncement(
  id: string,
  input: {
    message?: string;
    href?: string | null;
    severity?: "info" | "warning" | "success";
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  }
) {
  const supabase = createServerSupabase();
  const patch: Record<string, unknown> = {};

  if (input.message !== undefined) {
    const message = input.message.trim();
    if (!message) throw new Error("請輸入公告內容");
    patch.message = message;
  }
  if (input.href !== undefined) {
    patch.href = input.href?.trim() || null;
  }
  if (input.severity !== undefined) {
    patch.severity = input.severity;
  }
  if (input.active !== undefined) {
    patch.active = input.active;
  }
  if (input.startsAt !== undefined) {
    patch.starts_at = input.startsAt?.trim() || null;
  }
  if (input.endsAt !== undefined) {
    patch.ends_at = input.endsAt?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("沒有可更新的欄位");
  }

  const { data, error } = await supabase
    .from("platform_announcements")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
