"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Globe2 } from "lucide-react";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";
import {
  GAME_SLUG_MAX_LENGTH,
  normalizeGameSlugInput,
  validateGameSlug,
} from "@/lib/game-slug";
import { buildGameSubdomainUrl } from "@/lib/subdomain";
import { cn } from "@/lib/utils";

type GameSlugFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  hasError?: boolean;
};

export function GameSlugField({
  value,
  onChange,
  disabled = false,
  required = false,
  hasError = false,
}: GameSlugFieldProps) {
  const t = useTranslations("dashboard");

  const normalized = useMemo(() => normalizeGameSlugInput(value), [value]);
  const validation = useMemo(() => {
    if (!normalized) return null;
    return validateGameSlug(normalized);
  }, [normalized]);

  const previewUrl = normalized
    ? buildGameSubdomainUrl(normalized)
    : buildGameSubdomainUrl("my-awesome-game");

  return (
    <div className="space-y-2">
      <label
        htmlFor="game-slug"
        className="block text-center text-sm font-medium text-zinc-200"
      >
        <RequiredFieldLabel required={required} optional={!required}>
          {t("gameSlugLabel")}
        </RequiredFieldLabel>
      </label>

      <div className="mx-auto flex max-w-md items-center gap-2">
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">
          https://
        </span>
        <input
          id="game-slug"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          maxLength={GAME_SLUG_MAX_LENGTH}
          onChange={(event) =>
            onChange(normalizeGameSlugInput(event.target.value))
          }
          placeholder={t("gameSlugPlaceholder")}
          disabled={disabled}
          className={cn(
            "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
            "placeholder:text-zinc-500 backdrop-blur-md outline-none transition-all duration-200",
            "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20",
            hasError && "border-rose-400/50 ring-2 ring-rose-400/20"
          )}
        />
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">
          .rainynightfrog.com
        </span>
      </div>

      <p className="text-center text-xs text-zinc-500">{t("gameSlugHint")}</p>

      <div
        className={cn(
          "mx-auto flex max-w-lg items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs",
          normalized && validation && !validation.ok
            ? "border-amber-400/25 bg-amber-500/5 text-amber-200/90"
            : "border-cyan-400/20 bg-cyan-500/5 text-cyan-100/90"
        )}
      >
        <Globe2 className="size-3.5 shrink-0 text-cyan-300/80" />
        <span className="truncate font-mono">{previewUrl}</span>
      </div>

      {normalized && validation && !validation.ok ? (
        <p className="text-center text-xs text-amber-300/90">{validation.error}</p>
      ) : null}
    </div>
  );
}
