"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Wrench, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PublishChecklistPanel } from "@/components/creator-tools/publish-checklist-panel";
import type { PublishChecklistInput } from "@/lib/creator-tools/publish-checklist";
import { cn } from "@/lib/utils";

type PublishAssistantSidebarProps = {
  checklistInput: PublishChecklistInput;
  className?: string;
  style?: CSSProperties;
  /** 固定於畫面右側時啟用內部捲動與高度上限 */
  fixed?: boolean;
};

export function PublishAssistantSidebar({
  checklistInput,
  className,
  style,
  fixed = false,
}: PublishAssistantSidebarProps) {
  const t = useTranslations("creatorTools");

  const fixedStyle: CSSProperties | undefined = fixed
    ? {
        left: "max(1rem, min(calc(50% + 24rem + 1.5rem), calc(100vw - 19rem)))",
        ...style,
      }
    : style;

  return (
    <aside
      className={cn(
        "space-y-4",
        fixed && "fixed top-[5.5rem] z-30 w-72",
        className
      )}
      style={fixedStyle}
    >
      <div
        className={cn(
          "flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 shadow-xl shadow-black/30 backdrop-blur-sm",
          fixed && "max-h-[calc(100vh-7rem)]"
        )}
      >
        <div className="shrink-0 border-b border-white/8 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Wrench className="size-4 text-cyan-300" />
            {t("sidebarTitle")}
          </div>
          <p className="mt-1 text-xs text-zinc-400">{t("sidebarDesc")}</p>
        </div>
        <div
          className={cn(
            "p-4",
            fixed && "min-h-0 flex-1 overflow-y-auto overscroll-contain"
          )}
        >
          <PublishChecklistPanel input={checklistInput} compact showTitle={false} />
        </div>
        <div className="shrink-0 border-t border-white/8 px-4 py-3">
          <Link
            href="/dashboard/tools"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-full gap-2 border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
            )}
          >
            <ExternalLink className="size-3.5" />
            {t("sidebarOpenTools")}
          </Link>
        </div>
      </div>
    </aside>
  );
}
