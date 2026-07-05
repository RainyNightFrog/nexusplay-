"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Flame, Loader2 } from "lucide-react";
import { GAME_GENRES, GAME_TAGS } from "@/lib/game-metadata";
import { cn } from "@/lib/utils";

const FALLBACK_SHORTCUTS = [...GAME_GENRES.slice(0, 6), ...GAME_TAGS.slice(0, 6)];

type SearchShortcutsProps = {
  className?: string;
};

export function SearchShortcuts({ className }: SearchShortcutsProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const [terms, setTerms] = useState<string[]>(FALLBACK_SHORTCUTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/search/popular")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { terms?: string[] } | null) => {
        if (Array.isArray(data?.terms) && data.terms.length > 0) {
          setTerms(data.terms);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-zinc-900/50 p-4", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
        <Flame className="size-4 text-amber-400" />
        {t("popularShortcuts")}
        {loading && <Loader2 className="size-3.5 animate-spin text-zinc-500" aria-hidden />}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {terms.map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => router.push(`/search?q=${encodeURIComponent(label)}`)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
