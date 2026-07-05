"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { AccountSettingsNav } from "@/components/settings/account-settings-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountSettingsLayoutProps = {
  children: React.ReactNode;
};

export function AccountSettingsLayout({ children }: AccountSettingsLayoutProps) {
  const t = useTranslations("nav");

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader maxWidth="7xl">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-cyan-300"
          )}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{t("backHome")}</span>
        </Link>

        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-3 backdrop-blur-sm">
              <AccountSettingsNav />
            </div>
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function AccountSettingsPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );
}
