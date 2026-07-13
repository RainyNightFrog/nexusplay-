"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type AdminLoadingStateProps = {
  className?: string;
  spinnerClassName?: string;
  minHeightClassName?: string;
};

export function AdminLoadingState({
  className,
  spinnerClassName = "text-cyan-400",
  minHeightClassName = "min-h-40",
}: AdminLoadingStateProps) {
  const t = useTranslations("admin");

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-10",
        minHeightClassName,
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn("size-8 animate-spin", spinnerClassName)} />
      <p className="text-sm text-zinc-500">{t("loading")}</p>
    </div>
  );
}
