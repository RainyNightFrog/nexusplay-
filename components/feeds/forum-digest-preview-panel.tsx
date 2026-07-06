"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ForumDigestPreview } from "@/lib/forum-digest-service";

type ForumDigestPreviewPanelProps = {
  enabled: boolean;
};

export function ForumDigestPreviewPanel({ enabled }: ForumDigestPreviewPanelProps) {
  const t = useTranslations("settings");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ForumDigestPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forum-digest/preview");
      const data = (await response.json()) as {
        preview?: ForumDigestPreview;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? t("forumDigestPreviewFailed"));
        setPreview(null);
        return;
      }
      setPreview(data.preview ?? null);
    } catch {
      setError(t("forumDigestPreviewFailed"));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="space-y-3 text-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void loadPreview()}
        className="border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-3.5 animate-spin" />
            {t("forumDigestPreviewLoading")}
          </>
        ) : (
          t("forumDigestPreviewBtn")
        )}
      </Button>

      {error ? <p className="text-xs text-rose-400">{error}</p> : null}

      {preview ? (
        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-left">
          <p className="text-sm font-medium text-zinc-200">{preview.subject}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("forumDigestPreviewMeta", {
              days: preview.periodDays,
              count: preview.posts.length,
            })}
          </p>
          {preview.posts.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">{t("forumDigestPreviewEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {preview.posts.map((post) => (
                <li key={post.url} className="text-xs text-zinc-400">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-violet-300 hover:underline"
                  >
                    {post.title}
                  </a>
                  <span className="text-zinc-600"> · {post.gameTitle}</span>
                  <p className="mt-0.5 line-clamp-2 text-zinc-500">{post.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
