"use client";

import { useTranslations } from "next-intl";
import type { GamePublishStatus } from "@/lib/game-publish";
import { cn } from "@/lib/utils";

type PublishRequiredHintProps = {
  publishStatus: GamePublishStatus;
  active?: boolean;
  className?: string;
};

export function PublishRequiredHint({
  publishStatus,
  active = true,
  className,
}: PublishRequiredHintProps) {
  const t = useTranslations("dashboard");
  const isPublic = publishStatus === "public";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-center text-xs leading-relaxed transition-opacity",
        isPublic
          ? "border-cyan-400/20 bg-cyan-500/5 text-cyan-100/90"
          : "border-amber-400/20 bg-amber-500/5 text-amber-100/90",
        !active && "opacity-70",
        className
      )}
    >
      <p className="font-medium">
        {isPublic ? t("publishRequiredPublicTitle") : t("publishRequiredDraftTitle")}
      </p>
      <p className="mt-1 text-zinc-400">
        {isPublic ? t("publishRequiredPublicDesc") : t("publishRequiredDraftDesc")}
      </p>
    </div>
  );
}
