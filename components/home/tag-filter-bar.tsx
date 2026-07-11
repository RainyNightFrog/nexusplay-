"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GAME_TAG_GROUPS,
  GAME_TAGS,
  type GameTag,
} from "@/lib/game-metadata";
import { TAG_COLORS } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { cn } from "@/lib/utils";

const HOT_TAGS = GAME_TAGS.slice(0, 24);

type TagFilterBarProps = {
  selectedTags: GameTag[];
  onChange: (tags: GameTag[]) => void;
};

export function TagFilterBar({ selectedTags, onChange }: TagFilterBarProps) {
  const t = useTranslations("home");
  const { localizedTag } = useGameI18n();
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  function toggleTag(tag: GameTag) {
    if (selectedSet.has(tag)) {
      onChange(selectedTags.filter((item) => item !== tag));
      return;
    }
    onChange([...selectedTags, tag]);
  }

  function clearTags() {
    onChange([]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn(
        "mb-6 rounded-2xl border border-white/10 bg-zinc-900/55 p-4 shadow-xl shadow-black/20 backdrop-blur-md sm:p-5"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Tag className="size-4 text-fuchsia-400" />
          <span>{t("tagFilterLabel")}</span>
          <Badge variant="outline" className="border-white/10 bg-white/5 text-zinc-400">
            {GAME_TAGS.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedTags.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearTags}
              className="h-8 gap-1 text-zinc-400 hover:text-rose-300"
            >
              <X className="size-3.5" />
              {t("tagFilterClear", { count: selectedTags.length })}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            className="h-8 gap-1 border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            <Sparkles className="size-3.5 text-cyan-400" />
            {expanded ? t("tagFilterCollapse") : t("tagFilterExpand")}
            {expanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!expanded && (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {HOT_TAGS.map((tag) => {
            const active = selectedSet.has(tag);
            return (
              <motion.button
                key={tag}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleTag(tag)}
                className="shrink-0"
              >
                <Badge
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "h-8 cursor-pointer whitespace-nowrap px-3 text-xs transition-all",
                    active
                      ? "border-transparent bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-md shadow-fuchsia-500/20"
                      : cn(
                          "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10",
                          TAG_COLORS[tag]
                        )
                  )}
                >
                  {localizedTag(tag)}
                </Badge>
              </motion.button>
            );
          })}
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 max-h-[min(420px,50vh)] space-y-4 overflow-y-auto pr-1">
              {GAME_TAG_GROUPS.map((group) => (
                <div key={group.labelKey}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {t(group.labelKey as "tagGroupArtStyle")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((tag) => {
                      const active = selectedSet.has(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="shrink-0"
                        >
                          <Badge
                            variant={active ? "default" : "outline"}
                            className={cn(
                              "h-7 cursor-pointer px-2.5 text-[11px] transition-all",
                              active
                                ? "border-transparent bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
                                : "border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                            )}
                          >
                            {localizedTag(tag)}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTags.length > 0 && (
        <p className="mt-3 text-center text-xs text-zinc-500">
          {t("tagFilterSelectedHint", { count: selectedTags.length })}
        </p>
      )}
    </motion.div>
  );
}
