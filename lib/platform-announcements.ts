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
