"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  GAME_GENRES,
  GAME_TAG_GROUPS,
  MAX_GAME_TAGS,
  type GameGenre,
  type GameTag,
} from "@/lib/game-metadata";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { cn } from "@/lib/utils";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";

type GenreTagPickerProps = {
  genre: GameGenre | "";
  tags: string[];
  onGenreChange: (genre: GameGenre) => void;
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  genreRequired?: boolean;
  genreError?: boolean;
};

function GenreOption({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
          : "border-white/10 bg-zinc-900/40 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-cyan-400 bg-cyan-500" : "border-zinc-600"
        )}
      >
        {selected && <span className="size-1.5 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

function TagOption({
  label,
  selected,
  disabled,
  onToggle,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-white/8 bg-zinc-900/50 px-3 py-2.5 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected && "border-violet-400/40 bg-violet-500/10"
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
          selected
            ? "border-violet-400 bg-violet-500 text-white"
            : "border-white/20 bg-zinc-950/80"
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="text-sm text-zinc-300">{label}</span>
    </button>
  );
}

export function GenreTagPicker({
  genre,
  tags,
  onGenreChange,
  onTagsChange,
  disabled,
  genreRequired,
  genreError,
}: GenreTagPickerProps) {
  const t = useTranslations("dashboard");
  const { localizedTag } = useGameI18n();
  const tagListRef = useRef<HTMLDivElement>(null);
  const tagListScrollTopRef = useRef(0);

  useLayoutEffect(() => {
    const list = tagListRef.current;
    if (!list) return;
    list.scrollTop = tagListScrollTopRef.current;
  }, [tags]);

  const toggleTag = useCallback(
    (tag: GameTag) => {
      if (tagListRef.current) {
        tagListScrollTopRef.current = tagListRef.current.scrollTop;
      }

      if (tags.includes(tag)) {
        onTagsChange(tags.filter((item) => item !== tag));
        return;
      }
      if (tags.length >= MAX_GAME_TAGS) return;
      onTagsChange([...tags, tag]);
    },
    [onTagsChange, tags]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-zinc-200">
            <RequiredFieldLabel required={genreRequired}>
              {t("genreCoreLabel")}
            </RequiredFieldLabel>
          </p>
          <p className="text-xs text-zinc-500">{t("genreCoreDesc")}</p>
        </div>

        <div
          className={cn(
            "grid gap-2 rounded-xl sm:grid-cols-2 lg:grid-cols-3",
            genreError && "ring-2 ring-rose-400/40"
          )}
        >
          {GAME_GENRES.map((item) => (
            <GenreOption
              key={item}
              label={localizedTag(item)}
              selected={genre === item}
              disabled={disabled}
              onClick={() => onGenreChange(item)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-sm font-medium text-zinc-200">
              {t("tagsSubLabel")}
            </p>
            <Badge
              variant="outline"
              className="border-violet-400/30 text-violet-300"
            >
              {tags.length}/{MAX_GAME_TAGS}
            </Badge>
          </div>
          <p className="text-center text-xs text-zinc-500">
            {t("tagsSubDesc", { max: MAX_GAME_TAGS })}
          </p>
        </div>

        <div className="h-96 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40">
          <div className="h-24 shrink-0 border-b border-white/8 px-4 py-3">
            <p className="mb-2 text-center text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              {t("tagsSelectedLabel")}
            </p>
            <div className="h-12 overflow-y-auto overscroll-contain">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="border-violet-400/30 bg-violet-500/15 text-violet-200"
                    >
                      {localizedTag(tag)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600">{t("tagsEmpty")}</span>
                )}
              </div>
            </div>
          </div>

          <div
            ref={tagListRef}
            className="h-[calc(24rem-6rem)] overflow-y-auto overscroll-contain p-4 [overflow-anchor:none]"
          >
            <div className="space-y-4">
              {GAME_TAG_GROUPS.map((group) => (
                <div key={group.labelKey} className="space-y-2">
                  <p className="text-center text-xs font-semibold tracking-wide text-violet-300/90 uppercase">
                    {t(group.labelKey)}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {group.tags.map((item) => {
                      const selected = tags.includes(item);
                      const atLimit = !selected && tags.length >= MAX_GAME_TAGS;

                      return (
                        <TagOption
                          key={item}
                          label={localizedTag(item)}
                          selected={selected}
                          disabled={disabled || atLimit}
                          onToggle={() => toggleTag(item)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
