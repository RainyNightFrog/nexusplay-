"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Clock, X } from "lucide-react";
import {
  clearSearchHistory,
  readSearchHistory,
  removeSearchHistoryItem,
} from "@/lib/search-history";
import { cn } from "@/lib/utils";

type SearchHistoryPanelProps = {
  className?: string;
  onSelect?: (query: string) => void;
};

export function SearchHistoryPanel({ className, onSelect }: SearchHistoryPanelProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    setItems(readSearchHistory());
  }, []);

  if (items.length === 0) return null;

  function refresh() {
    setItems(readSearchHistory());
  }

  function handleSelect(query: string) {
    onSelect?.(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleRemove(query: string) {
    removeSearchHistoryItem(query);
    refresh();
  }

  function handleClear() {
    clearSearchHistory();
    refresh();
  }

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-zinc-900/50 p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
          <Clock className="size-4 text-cyan-400" />
          {t("recentSearches")}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-zinc-500 hover:text-violet-400"
        >
          {t("clearHistory")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((query) => (
          <span
            key={query}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 pl-3 pr-1 text-sm text-zinc-200"
          >
            <button
              type="button"
              onClick={() => handleSelect(query)}
              className="py-1 hover:text-cyan-300"
            >
              {query}
            </button>
            <button
              type="button"
              onClick={() => handleRemove(query)}
              className="rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
              aria-label={t("removeHistoryItem", { query })}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
