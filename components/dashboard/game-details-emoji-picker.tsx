"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GAME_DETAILS_EMOJI_CATEGORIES } from "@/lib/game-details-emojis";
import { cn } from "@/lib/utils";

type GameDetailsEmojiPickerProps = {
  disabled?: boolean;
  onPick: (emoji: string) => void;
};

export function GameDetailsEmojiPicker({
  disabled,
  onPick,
}: GameDetailsEmojiPickerProps) {
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
        aria-label="插入表情"
        className="inline-flex size-8 items-center justify-center rounded-md text-zinc-400 outline-none hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        <Smile className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="w-72 border-white/10 bg-zinc-950 p-3 text-zinc-100"
      >
        <p className="mb-2 text-center text-xs font-medium text-zinc-400">
          插入表情
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
        <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto overscroll-contain">
          {category.emojis.map((emoji) => (
            <button
              key={`${category.id}-${emoji}`}
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-white/10"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
