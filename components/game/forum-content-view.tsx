"use client";

import {
  looksLikeForumHtml,
  stripHtmlForPreview,
} from "@/lib/forum-content";
import { sanitizeRichHtmlForRender } from "@/lib/sanitize-rich-html";
import { cn } from "@/lib/utils";

type ForumContentViewProps = {
  content: string;
  className?: string;
  preview?: boolean;
  previewLines?: number;
};

export function ForumContentView({
  content,
  className,
  preview = false,
  previewLines = 2,
}: ForumContentViewProps) {
  if (!content) return null;

  if (looksLikeForumHtml(content)) {
    if (preview) {
      return (
        <p
          className={cn(
            "text-sm leading-relaxed text-zinc-500",
            previewLines === 2 && "line-clamp-2",
            className
          )}
        >
          {stripHtmlForPreview(content)}
        </p>
      );
    }

    return (
      <div
        className={cn(
          "game-details-content forum-content prose prose-invert prose-sm max-w-none text-sm leading-relaxed",
          className
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtmlForRender(content) }}
      />
    );
  }

  return (
    <p
      className={cn(
        "whitespace-pre-wrap text-sm leading-relaxed",
        preview && previewLines === 2 && "line-clamp-2 text-zinc-500",
        className
      )}
    >
      {content}
    </p>
  );
}
