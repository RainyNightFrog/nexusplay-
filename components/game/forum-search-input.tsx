"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  getForumCategoryMeta,
  type ForumPostWithGame,
} from "@/lib/forum";
import { stripHtmlForPreview } from "@/lib/forum-content";
import { cn } from "@/lib/utils";

type SearchSuggestion = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

type ForumSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  posts: ForumPostWithGame[];
  className?: string;
};

function addSuggestion(
  bucket: SearchSuggestion[],
  seen: Set<string>,
  item: SearchSuggestion
) {
  const dedupeKey = `${item.hint}:${item.value.toLowerCase()}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  bucket.push(item);
}

export function ForumSearchInput({
  value,
  onChange,
  posts,
  className,
}: ForumSearchInputProps) {
  const t = useTranslations("forum");
  const containerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    const results: SearchSuggestion[] = [];
    const seen = new Set<string>();

    for (const post of posts) {
      if (results.length >= 8) break;

      if (post.title.toLowerCase().includes(query)) {
        addSuggestion(results, seen, {
          key: `title-${post.id}`,
          label: post.title,
          value: post.title,
          hint: t("searchHintTitle"),
        });
      }

      if (post.author_name.toLowerCase().includes(query)) {
        addSuggestion(results, seen, {
          key: `author-${post.user_id}`,
          label: post.author_name,
          value: post.author_name,
          hint: t("searchHintAuthor"),
        });
      }

      const categoryMeta = getForumCategoryMeta(post.category);
      const categoryLabel = t(`categories.${categoryMeta.value}`);
      if (
        categoryLabel.toLowerCase().includes(query) ||
        post.category.toLowerCase().includes(query)
      ) {
        addSuggestion(results, seen, {
          key: `category-${post.category}`,
          label: `${categoryMeta.emoji} ${categoryLabel}`,
          value: categoryLabel,
          hint: t("searchHintCategory"),
        });
      }

      if (post.game_title?.toLowerCase().includes(query)) {
        addSuggestion(results, seen, {
          key: `game-${post.game_id}`,
          label: post.game_title,
          value: post.game_title,
          hint: t("searchHintGame"),
        });
      }

      const contentPreview = stripHtmlForPreview(post.content);
      if (
        contentPreview.toLowerCase().includes(query) &&
        contentPreview.length > 0
      ) {
        const snippet =
          contentPreview.length > 48
            ? `${contentPreview.slice(0, 48)}…`
            : contentPreview;
        addSuggestion(results, seen, {
          key: `content-${post.id}`,
          label: snippet,
          value: post.title,
          hint: t("searchHintContent"),
        });
      }
    }

    return results.slice(0, 8);
  }, [posts, t, value]);

  const showSuggestions = focused && value.trim().length > 0;

  useEffect(() => {
    if (!showSuggestions) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showSuggestions]);

  const hintText = (() => {
    if (!focused && !value.trim()) return null;
    if (!value.trim()) return t("searchHintIdle");
    if (suggestions.length > 0) return t("searchHintTyping");
    return t("searchHintNoSuggestions");
  })();

  return (
    <div ref={containerRef} className={cn("mx-auto w-full max-w-md", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={t("searchPlaceholder")}
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          className="border-white/10 bg-white/5 px-10 text-center text-zinc-100 placeholder:text-center placeholder:text-zinc-500"
        />
      </div>

      {hintText && (
        <p className="mt-2 text-center text-xs text-zinc-500">{hintText}</p>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 text-left shadow-xl shadow-black/30 backdrop-blur-md"
        >
          {suggestions.map((item) => (
            <li key={item.key} role="option">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(item.value);
                  setFocused(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-violet-500/10"
              >
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                  {item.hint}
                </span>
                <span className="min-w-0 truncate text-sm text-zinc-200">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
