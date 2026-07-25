"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AVATAR_PRESET_PAGE_SIZE,
  avatarUrlMatchesPresetId,
  listSelectableAvatarPresets,
} from "@/lib/virtual-player-avatar";

type PresetAvatarPickerProps = {
  currentAvatarUrl: string | null;
  disabled?: boolean;
  pendingPresetId?: string | null;
  onSelect: (presetId: string) => void;
};

export function PresetAvatarPicker({
  currentAvatarUrl,
  disabled = false,
  pendingPresetId = null,
  onSelect,
}: PresetAvatarPickerProps) {
  const t = useTranslations("profile");
  const [page, setPage] = useState(1);
  const selecting = pendingPresetId != null;

  const presets = useMemo(() => listSelectableAvatarPresets(128), []);
  const totalPages = Math.max(
    1,
    Math.ceil(presets.length / AVATAR_PRESET_PAGE_SIZE)
  );
  const safePage = Math.min(page, totalPages);
  const pageItems = presets.slice(
    (safePage - 1) * AVATAR_PRESET_PAGE_SIZE,
    safePage * AVATAR_PRESET_PAGE_SIZE
  );

  return (
    <div className="mt-5 w-full max-w-md space-y-3">
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-400">
        <Sparkles className="size-3.5 text-cyan-400" />
        {t("presetAvatarsTitle")}
      </div>
      <p className="text-center text-[11px] leading-relaxed text-zinc-600">
        {t("presetAvatarsHint", { count: presets.length })}
      </p>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {pageItems.map((preset) => {
          const isPending = pendingPresetId === preset.id;
          const isSelected =
            !selecting &&
            avatarUrlMatchesPresetId(currentAvatarUrl, preset.id);

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || selecting || isSelected}
              onClick={() => onSelect(preset.id)}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-full border p-0.5",
                "bg-white/[0.02] transition-all duration-200",
                "hover:border-cyan-400/40 hover:bg-cyan-500/5",
                "disabled:pointer-events-none",
                (disabled || selecting) && !isSelected && !isPending
                  ? "opacity-60"
                  : null,
                isSelected || isPending
                  ? "border-cyan-400/60 bg-cyan-500/10 shadow-sm shadow-cyan-500/20"
                  : "border-white/8"
              )}
              aria-label={t("presetAvatarsTitle")}
            >
              <span className="relative block size-full overflow-hidden rounded-full bg-zinc-900">
                <Image
                  src={preset.url}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  sizes="72px"
                />
                {isPending ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-zinc-950/55">
                    <Loader2 className="size-4 animate-spin text-cyan-300" />
                  </span>
                ) : isSelected ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-cyan-950/40">
                    <Check className="size-4 text-cyan-300" />
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white"
            disabled={safePage <= 1 || disabled || selecting}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-3.5" />
            {t("presetAvatarsPrev")}
          </Button>
          <span className="text-xs tabular-nums text-zinc-500">
            {t("presetAvatarsPageInfo", {
              current: safePage,
              total: totalPages,
            })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 border-white/10 bg-white/5 px-2.5 text-xs text-zinc-300 hover:text-white"
            disabled={safePage >= totalPages || disabled || selecting}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("presetAvatarsNext")}
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
