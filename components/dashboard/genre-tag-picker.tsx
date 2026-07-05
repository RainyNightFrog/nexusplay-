"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  GAME_GENRES,
  GAME_TAGS,
  MAX_GAME_TAGS,
  type GameGenre,
  type GameTag,
} from "@/lib/game-metadata";
import { cn } from "@/lib/utils";

type GenreTagPickerProps = {
  genre: GameGenre | "";
  tags: string[];
  onGenreChange: (genre: GameGenre) => void;
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
};

function NeonBadge({
  label,
  selected,
  accent,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  accent: "cyan" | "violet";
  onClick: () => void;
  disabled?: boolean;
}) {
  const glow =
    accent === "cyan"
      ? "shadow-[0_0_20px_rgba(34,211,238,0.45)] border-cyan-400/70 bg-cyan-500/20 text-cyan-100"
      : "shadow-[0_0_20px_rgba(167,139,250,0.45)] border-violet-400/70 bg-violet-500/20 text-violet-100";

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.04 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={cn(
        "group relative overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? glow
          : "border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
      )}
    >
      {!selected && (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-all duration-700 group-hover:translate-x-full group-hover:opacity-100",
            accent === "cyan"
              ? "bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
              : "bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"
          )}
        />
      )}
      <span className="relative inline-flex items-center gap-1.5">
        {selected && <Check className="size-3" />}
        {label}
      </span>
    </motion.button>
  );
}

export function GenreTagPicker({
  genre,
  tags,
  onGenreChange,
  onTagsChange,
  disabled,
}: GenreTagPickerProps) {
  const toggleTag = (tag: GameTag) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter((item) => item !== tag));
      return;
    }
    if (tags.length >= MAX_GAME_TAGS) return;
    onTagsChange([...tags, tag]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200">核心分類 (Genre)</p>
          <p className="text-xs text-zinc-500">
            選擇最能代表你遊戲的主要類型（單選）
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {GAME_GENRES.map((item) => (
            <NeonBadge
              key={item}
              label={item}
              selected={genre === item}
              accent="cyan"
              disabled={disabled}
              onClick={() => onGenreChange(item)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-sm font-medium text-zinc-200">子標籤 (Tags)</p>
            <Badge
              variant="outline"
              className="border-violet-400/30 text-violet-300"
            >
              {tags.length}/{MAX_GAME_TAGS}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">
            關鍵字標籤協助玩家搜尋，請勿重複核心分類（最多 {MAX_GAME_TAGS} 個）
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {GAME_TAGS.map((item) => (
            <NeonBadge
              key={item}
              label={item}
              selected={tags.includes(item)}
              accent="violet"
              disabled={disabled || (!tags.includes(item) && tags.length >= MAX_GAME_TAGS)}
              onClick={() => toggleTag(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
