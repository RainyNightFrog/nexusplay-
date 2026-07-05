import { createServerSupabase } from "@/lib/supabase-server";
import { normalizeAppLocale } from "@/lib/digest-i18n";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";

export async function readPreferredLocale(userId: string): Promise<AppLocale> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return normalizeAppLocale(data?.preferred_locale as string | undefined);
}

export async function updatePreferredLocale(userId: string, locale: AppLocale) {
  if (!(locales as readonly string[]).includes(locale)) {
    throw new Error("Invalid locale");
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_locale: locale })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export { defaultLocale };
