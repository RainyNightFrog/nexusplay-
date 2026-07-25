import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { GoogleAnalyticsProvider } from "@/components/analytics/google-analytics-provider";
import { ActivityPulseTracker } from "@/components/activity/activity-pulse-tracker";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSettingsProvider } from "@/components/settings/app-settings-provider";
import { NexusAuroraBackground } from "@/components/ui/nexus-aurora-background";
import { NexusCursorGlow } from "@/components/ui/nexus-cursor-glow";
import { ChatWidgetLazy } from "@/components/chat/chat-widget-lazy";
import { PlatformAnnouncementBanner } from "@/components/layout/platform-announcement-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { PwaInstallProvider } from "@/components/pwa/PwaInstallPrompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { routing } from "@/i18n/routing";
import { feedAlternateTypes, platformGamesFeedAlternates } from "@/lib/feed-discovery";
import { getSiteUrl } from "@/lib/site-url";
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
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "RainyNightFrog",
    template: "%s · RainyNightFrog",
  },
  description: "Web game platform for play and upload",
  applicationName: "RainyNightFrog",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RainyNightFrog",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    // Next 16 的 appleWebApp.capable 目前輸出為 mobile-web-app-capable；
    // iOS Safari 仍仰賴 apple- 前綴，故明確補上。
    "apple-mobile-web-app-capable": "yes",
  },
  alternates: {
    types: feedAlternateTypes(platformGamesFeedAlternates()),
  },
  openGraph: {
    type: "website",
    siteName: "RainyNightFrog",
    locale: "zh_HK",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RainyNightFrog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a10",
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
        <div className="nexus-app-content flex min-h-screen min-h-dvh flex-col">
          <NextIntlClientProvider messages={messages} locale={locale}>
            <AuthProvider>
              <AppSettingsProvider>
                <PwaInstallProvider>
                  <PwaRegister />
                  <PageViewTracker />
                  <GoogleAnalyticsProvider />
                  <ActivityPulseTracker />
                  <ChatWidgetLazy />
                  <PlatformAnnouncementBanner />
                  <div className="flex-1">{children}</div>
                  <SiteFooter />
                </PwaInstallProvider>
              </AppSettingsProvider>
            </AuthProvider>
          </NextIntlClientProvider>
        </div>
        <NexusCursorGlow />
      </body>
    </html>
  );
}
