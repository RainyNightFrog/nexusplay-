"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MAX_PROFILE_SHOWCASE_TAGS,
  PROFILE_SHOWCASE_TAG_IDS,
  normalizeProfileShowcaseTags,
  type ProfileShowcaseTagId,
} from "@/lib/profile-showcase-tags";
import { cn } from "@/lib/utils";

type ProfileShowcaseTagsEditorProps = {
  value: ProfileShowcaseTagId[];
  onChange: (value: ProfileShowcaseTagId[]) => void;
  className?: string;
};

export function ProfileShowcaseTagsEditor({
  value,
  onChange,
  className,
}: ProfileShowcaseTagsEditorProps) {
  const t = useTranslations("accountSettings");

  const selected = normalizeProfileShowcaseTags(value);
  const selectedSet = new Set(selected);

  function toggleTag(tagId: ProfileShowcaseTagId, checked: boolean) {
    if (checked) {
      if (selectedSet.has(tagId) || selected.length >= MAX_PROFILE_SHOWCASE_TAGS) {
        return;
      }
      onChange(normalizeProfileShowcaseTags([...selected, tagId]));
      return;
    }

    onChange(selected.filter((item) => item !== tagId));
  }

  function moveTag(tagId: ProfileShowcaseTagId, direction: -1 | 1) {
    const index = selected.indexOf(tagId);
    if (index === -1) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;

    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onChange(next);
  }

  function labelForTag(tagId: ProfileShowcaseTagId) {
    return t(`showcaseTag_${tagId}` as "showcaseTag_online_rank");
  }

  return (
    <div className={cn("space-y-4", className)}>
      <p className="text-xs leading-relaxed text-zinc-500">
        {t("showcaseTagsMaxHint", { max: MAX_PROFILE_SHOWCASE_TAGS })}
      </p>

      <div className="space-y-2">
        {PROFILE_SHOWCASE_TAG_IDS.map((tagId) => {
          const checked = selectedSet.has(tagId);
          const disabled =
            !checked && selected.length >= MAX_PROFILE_SHOWCASE_TAGS;

          return (
            <label
              key={tagId}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5",
                disabled && "opacity-50"
              )}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) => toggleTag(tagId, next === true)}
                className="mt-0.5 shrink-0 border-white/20 data-checked:border-cyan-500 data-checked:bg-cyan-500"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">
                  {labelForTag(tagId)}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {t(`showcaseTagDesc_${tagId}` as "showcaseTagDesc_online_rank")}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">
            {t("showcaseTagsOrderTitle")}
          </p>
          <div className="space-y-2">
            {selected.map((tagId, index) => (
              <div
                key={tagId}
                className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
              >
                <span className="text-sm text-zinc-200">
                  {index + 1}. {labelForTag(tagId)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("showcaseTagsMoveUp")}
                    disabled={index === 0}
                    onClick={() => moveTag(tagId, -1)}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("showcaseTagsMoveDown")}
                    disabled={index === selected.length - 1}
                    onClick={() => moveTag(tagId, 1)}
                    className="inline-flex size-7 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-30"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
