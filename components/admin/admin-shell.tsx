"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AdminShell({ title, description, children }: AdminShellProps) {
  const t = useTranslations("nav");

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
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

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-600">
            <Shield className="size-4 text-white" />
          </div>
          <span className="hidden truncate text-sm font-semibold text-white sm:inline">
            RainyNightFrog Admin
          </span>
        </div>

        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            <Shield className="size-3.5" />
            Super Admin
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-500">{description}</p>
        </div>
        <div className="text-center">{children}</div>
      </main>
    </div>
  );
}
