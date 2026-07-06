"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountShellProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

export function AccountShell({
  title,
  description,
  backHref = "/",
  backLabel,
  children,
}: AccountShellProps) {
  const t = useTranslations("nav");
  const resolvedBackLabel = backLabel ?? t("backHome");

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader maxWidth="7xl">
        <Link
          href={backHref}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-cyan-300"
          )}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{resolvedBackLabel}</span>
        </Link>

        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{description}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export const accountInputClassName = cn(
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 outline-none transition-all",
  "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

export const accountLabelClassName = "block text-center text-zinc-300";

export const accountFieldClassName = "space-y-2 text-center";

export const accountSectionClassName = "space-y-5 text-center";

export const accountSectionIntroClassName =
  "text-xs leading-relaxed text-zinc-500";

export const accountSectionCompactClassName = "space-y-4 text-center";

export const settingsSectionHeaderRowClassName = cn(
  "flex flex-wrap items-center justify-between gap-2 text-left"
);

export const settingsListRowClassName = cn(
  "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8",
  "bg-zinc-950/40 px-4 py-3 text-left"
);

export const settingsInlineActionRowClassName = cn(
  "flex flex-col gap-3 text-left sm:flex-row sm:items-stretch"
);

export const accountNavLinkClassName = cn(
  "flex items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors"
);

export const accountNavGroupLabelClassName = cn(
  "px-3 pb-1 pt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-600"
);

export const accountSelectTriggerClassName = cn(
  "relative mx-auto h-11 w-full max-w-xs border-white/10 bg-white/5 text-zinc-100",
  "hover:bg-white/8 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
);

export const accountCardClassName = cn(
  "rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center sm:p-8",
  "shadow-xl shadow-black/40 backdrop-blur-sm"
);

export const accountSectionTitleClassName = cn(
  "flex items-center justify-center gap-2 text-sm font-semibold text-white"
);

export const settingsToggleRowClassName = cn(
  "flex cursor-pointer items-start gap-4 rounded-xl border border-white/8",
  "bg-white/[0.02] p-4 text-left transition-colors hover:border-violet-400/20"
);
