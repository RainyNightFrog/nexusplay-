"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAME_DETAILS_EMOJI_CATEGORIES } from "@/lib/game-details-emojis";
import { cn } from "@/lib/utils";

type ChatEmojiPickerProps = {
  disabled?: boolean;
  onPick: (emoji: string) => void;
};

export function ChatEmojiPicker({ disabled, onPick }: ChatEmojiPickerProps) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    GAME_DETAILS_EMOJI_CATEGORIES[0]?.id ?? "common"
  );

  const category =
    GAME_DETAILS_EMOJI_CATEGORIES.find((item) => item.id === activeCategory) ??
    GAME_DETAILS_EMOJI_CATEGORIES[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t("emojiPicker")}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 outline-none transition-colors hover:bg-white/8 hover:text-cyan-300 disabled:opacity-50"
      >
        <Smile className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="w-80 border-white/10 bg-zinc-950/98 p-3 text-zinc-100 shadow-2xl backdrop-blur-xl"
      >
        <p className="mb-2 text-center text-xs font-medium text-zinc-400">
          {t("emojiPicker")}
        </p>
        <div className="mb-3 flex flex-wrap justify-center gap-1">
          {GAME_DETAILS_EMOJI_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveCategory(item.id)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                activeCategory === item.id
                  ? "bg-cyan-500/20 text-cyan-200"
                  : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto overscroll-contain">
          {category.emojis.map((emoji) => (
            <button
              key={`${category.id}-${emoji}`}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-white/10"
              onClick={() => onPick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
