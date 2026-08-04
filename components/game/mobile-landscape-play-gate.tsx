"use client";

import { RotateCcw, Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type MobileLandscapePlayGateProps = {
  onExit: () => void;
  onRetryLock?: () => void;
  /** 玩家選擇繼續直屏遊玩（不強制橫持） */
  onContinuePortrait?: () => void;
};

/** 直屏建議層：推薦橫持以獲得較大畫面，但可由玩家選擇直屏繼續 */
export function MobileLandscapePlayGate({
  onExit,
  onRetryLock,
  onContinuePortrait,
}: MobileLandscapePlayGateProps) {
  const t = useTranslations("common");

  return (
    <div
      className="absolute inset-0 z-[40] flex flex-col items-center justify-center gap-5 bg-zinc-950/95 px-6 text-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-landscape-gate-title"
    >
      <div className="relative flex size-20 items-center justify-center">
        <Smartphone
          className="size-14 text-cyan-300/90"
          style={{ transform: "rotate(90deg)" }}
          aria-hidden
        />
        <RotateCcw
          className="absolute -right-1 -top-1 size-6 animate-pulse text-fuchsia-300"
          aria-hidden
        />
      </div>
      <div className="max-w-sm space-y-2">
        <h2
          id="mobile-landscape-gate-title"
          className="text-lg font-semibold text-white"
        >
          {t("rotateToLandscapeTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          {t("rotateToLandscapeDesc")}
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {onRetryLock ? (
          <Button
            type="button"
            onClick={onRetryLock}
            className="min-h-11 w-full bg-gradient-to-r from-cyan-600 to-violet-600 text-white touch-manipulation"
          >
            {t("rotateToLandscapeAction")}
          </Button>
        ) : null}
        {onContinuePortrait ? (
          <Button
            type="button"
            variant="outline"
            onClick={onContinuePortrait}
            className="min-h-11 w-full border-white/15 bg-white/5 text-zinc-200 touch-manipulation"
          >
            {t("continuePortraitPlay")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          onClick={onExit}
          className="min-h-11 w-full gap-2 text-zinc-400 touch-manipulation hover:text-zinc-200"
        >
          <X className="size-4" />
          {t("exitFullscreenPlay")}
        </Button>
      </div>
    </div>
  );
}
