import { NextResponse } from "next/server";
import { locales, type AppLocale } from "@/i18n/routing";
import { updatePreferredLocale } from "@/lib/locale-preference-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function PATCH(request: Request) {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as { locale?: string };
    const locale = body.locale?.trim();

    if (!locale || !(locales as readonly string[]).includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    await updatePreferredLocale(user.id, locale as AppLocale);
    return NextResponse.json({ locale });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新語系偏好失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
