import { Suspense } from "react";
import { cookies } from "next/headers";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import {
  AuthCallbackScreen,
  type AuthCallbackMessageKey,
} from "@/components/auth/auth-callback-screen";
import { defaultLocale, routing } from "@/i18n/routing";
import { AuthCallbackClient } from "./auth-callback-client";

async function resolveCallbackLocale() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  if (cookieLocale && hasLocale(routing.locales, cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}

function AuthCallbackFallback({
  messageKey = "callbackCompleting",
}: {
  messageKey?: AuthCallbackMessageKey;
}) {
  return <AuthCallbackScreen messageKey={messageKey} />;
}

export default async function AuthCallbackPage() {
  const locale = await resolveCallbackLocale();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Suspense fallback={<AuthCallbackFallback />}>
        <AuthCallbackClient />
      </Suspense>
    </NextIntlClientProvider>
  );
}
