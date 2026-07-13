import { Geist, Geist_Mono } from "next/font/google";
import { NexusAuroraBackground } from "@/components/ui/nexus-aurora-background";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-screen min-h-dvh bg-transparent text-zinc-100">
        <NexusAuroraBackground />
        <div className="nexus-app-content relative min-h-screen min-h-dvh">
          {children}
        </div>
      </body>
    </html>
  );
}
