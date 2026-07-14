"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Split text so emoji runs stay outside background-clip rainbow fills. */
const EMOJI_SPLIT_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu;

const emojiResetStyle: CSSProperties = {
  display: "inline",
  background: "none",
  backgroundImage: "none",
  WebkitBackgroundClip: "unset",
  backgroundClip: "unset",
  color: "#f4f4f5",
  WebkitTextFillColor: "#f4f4f5",
  filter: "none",
  animation: "none",
};

type RainbowSafeTextProps = {
  text: string;
  rainbowClassName: string;
  className?: string;
};

export function RainbowSafeText({
  text,
  rainbowClassName,
  className,
}: RainbowSafeTextProps) {
  const parts = text.split(EMOJI_SPLIT_RE);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        if (!part) return null;
        const isEmoji = index % 2 === 1;
        if (isEmoji) {
          return (
            <span key={index} style={emojiResetStyle}>
              {part}
            </span>
          );
        }
        return (
          <span key={index} className={cn("!inline", rainbowClassName)}>
            {part}
          </span>
        );
      })}
    </span>
  );
}
