"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

type CreatorUpcomingDevlogPanelProps = {
  gameId: number;
  initialIsUpcoming?: boolean;
  className?: string;
};

export function CreatorUpcomingDevlogPanel({
  gameId,
  initialIsUpcoming = false,
  className,
}: CreatorUpcomingDevlogPanelProps) {
  const t = useTranslations("dashboard");
  const tw = useTranslations("wishlist");
  const { translateApiError } = useApiError();

  const [isUpcoming, setIsUpcoming] = useState(initialIsUpcoming);
  const [upcomingBusy, setUpcomingBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleUpcoming() {
    setUpcomingBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = !isUpcoming;
      const response = await fetch(`/api/games/${gameId}/upcoming`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUpcoming: next }),
      });
      const data = (await response.json()) as {
        isUpcoming?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(data.error) ?? t("upcomingUpdateFailed"));
        return;
      }
      setIsUpcoming(data.isUpcoming === true);
      setMessage(
        data.isUpcoming ? t("upcomingEnabled") : t("upcomingDisabled")
      );
    } catch {
      setError(t("upcomingUpdateFailed"));
    } finally {
      setUpcomingBusy(false);
    }
  }

  async function publishDevlog() {
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const html = content
        .split(/\n{2,}/)
        .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
        .join("");

      const response = await fetch(`/api/games/${gameId}/devlogs`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentHtml: html || `<p>${content}</p>`,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(translateApiError(data.error) ?? t("devlogPublishFailed"));
        return;
      }
      setTitle("");
      setContent("");
      setMessage(t("devlogPublishSuccess"));
    } catch {
      setError(t("devlogPublishFailed"));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section
      className={cn(
        "space-y-5 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-5",
        className
      )}
    >
      <div className="text-center">
        <p className="text-sm font-semibold text-fuchsia-100">
          {t("upcomingDevlogSection")}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{t("upcomingDevlogHint")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={upcomingBusy}
          onClick={() => void toggleUpcoming()}
          className={cn(
            "gap-2",
            isUpcoming
              ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_20px_rgba(232,121,249,0.35)]"
              : "border-white/10 bg-white/5 text-zinc-300"
          )}
        >
          {upcomingBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          {isUpcoming ? tw("upcomingOn") : tw("upcomingOff")}
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-zinc-950/40 p-4">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-200">
          <BookOpen className="size-4 text-cyan-400" />
          {t("publishDevlogStandalone")}
        </div>
        <input
          type="text"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("devlogTitle")}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
            "text-center text-sm text-zinc-100 outline-none",
            "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
          )}
        />
        <textarea
          value={content}
          rows={5}
          maxLength={8000}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t("devlogContent")}
          className={cn(
            "w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3",
            "text-center text-sm leading-relaxed text-zinc-100 outline-none",
            "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
          )}
        />
        <div className="flex justify-center">
          <Button
            type="button"
            disabled={publishing || !title.trim() || !content.trim()}
            onClick={() => void publishDevlog()}
            className="gap-2 bg-cyan-600 hover:bg-cyan-500"
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BookOpen className="size-4" />
            )}
            {t("publishDevlogButton")}
          </Button>
        </div>
      </div>

      {message && (
        <p className="text-center text-xs text-emerald-300">{message}</p>
      )}
      {error && <p className="text-center text-xs text-rose-400">{error}</p>}
    </section>
  );
}
