import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";

export async function resolveRequestLocale(
  request: Request
): Promise<AppLocale> {
  const url = new URL(request.url);
  const queryLocale = url.searchParams.get("locale");
  if (queryLocale && hasLocale(locales, queryLocale)) {
    return queryLocale;
  }

  const headerLocale = request.headers.get("x-nexusplay-locale");
  if (headerLocale && hasLocale(locales, headerLocale)) {
    return headerLocale;
  }

  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
    if (cookieLocale && hasLocale(locales, cookieLocale)) {
      return cookieLocale;
    }
  } catch {
    // Route handlers outside request scope may not access cookies.
  }

  return defaultLocale;
}
