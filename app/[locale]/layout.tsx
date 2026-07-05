import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { ActivityPulseTracker } from "@/components/activity/activity-pulse-tracker";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSettingsProvider } from "@/components/settings/app-settings-provider";
import { NexusAuroraBackground } from "@/components/ui/nexus-aurora-background";
import { NexusCursorGlow } from "@/components/ui/nexus-cursor-glow";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusPlay",
  description: "Web game platform for play and upload",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-screen min-h-dvh flex-col bg-transparent">
        <NexusAuroraBackground />
        <div className="nexus-app-content">
          <NextIntlClientProvider messages={messages} locale={locale}>
            <AuthProvider>
              <AppSettingsProvider>
                <PageViewTracker />
                <ActivityPulseTracker />
                {children}
              </AppSettingsProvider>
            </AuthProvider>
          </NextIntlClientProvider>
        </div>
        <NexusCursorGlow />
      </body>
    </html>
  );
}
