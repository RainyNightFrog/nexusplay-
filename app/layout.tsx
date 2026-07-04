import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AppSettingsProvider } from "@/components/settings/app-settings-provider";
import { NexusAuroraBackground } from "@/components/ui/nexus-aurora-background";
import { NexusCursorGlow } from "@/components/ui/nexus-cursor-glow";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-screen min-h-dvh flex-col bg-transparent">
        <NexusAuroraBackground />
        <div className="nexus-app-content">
          <AuthProvider>
            <AppSettingsProvider>{children}</AppSettingsProvider>
          </AuthProvider>
        </div>
        <NexusCursorGlow />
      </body>
    </html>
  );
}
