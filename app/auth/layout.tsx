export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className="min-h-screen bg-zinc-950 antialiased">{children}</body>
    </html>
  );
}
