"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, UserPlus, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type FollowCreatorButtonProps = {
  creatorId: string;
  initialFollowing?: boolean;
  initialFollowerCount?: number;
  className?: string;
  compact?: boolean;
  showFollowerCount?: boolean;
  centered?: boolean;
  layout?: "inline" | "stacked";
  align?: "start" | "end";
  localOnly?: boolean;
};

export function FollowCreatorButton({
  creatorId,
  initialFollowing = false,
  initialFollowerCount = 0,
  className,
  compact = false,
  showFollowerCount = true,
  centered = false,
  layout = "inline",
  align = "start",
  localOnly = false,
}: FollowCreatorButtonProps) {
  const t = useTranslations("creatorPublic");
  const router = useRouter();
  const { profile } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasLocalFollowChange = useRef(false);

  useEffect(() => {
    if (localOnly) return;
    let cancelled = false;

    void fetch(`/api/creators/${creatorId}/follow`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data: { following?: boolean; followerCount?: number }) => {
        if (cancelled) return;
        if (typeof data.following === "boolean") {
          setFollowing(data.following);
        }
        if (typeof data.followerCount === "number") {
          setFollowerCount(data.followerCount);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [creatorId, localOnly]);

  useEffect(() => {
    if (localOnly && hasLocalFollowChange.current) return;
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount, localOnly]);

  if (profile?.id === creatorId && !localOnly) {
    if (!showFollowerCount) return null;
    return (
      <div
        className={cn(
          "flex flex-col gap-1",
          align === "end" ? "items-end text-right" : "items-start",
          className
        )}
      >
        <span className="text-xs font-medium text-zinc-500">{t("followersLabel")}</span>
        <p className="text-sm font-semibold text-zinc-200">
          {t("followerCount", { count: followerCount })}
        </p>
      </div>
    );
  }

  async function toggleFollow() {
    if (!profile) {
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (localOnly) {
      const willFollow = !following;
      hasLocalFollowChange.current = true;
      setFollowing(willFollow);
      setFollowerCount((count) => Math.max(0, count + (willFollow ? 1 : -1)));
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/creators/${creatorId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      const data = (await response.json()) as {
        following?: boolean;
        followerCount?: number;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? t("followFailed"));

      setFollowing(data.following === true);
      if (typeof data.followerCount === "number") {
        setFollowerCount(data.followerCount);
      }
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("followFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        layout === "stacked"
          ? cn("flex flex-col gap-1.5", align === "end" ? "items-end" : "items-start")
          : "",
        centered ? "flex flex-col items-center" : "",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          centered && "justify-center",
          layout === "stacked" &&
            cn("flex-col gap-1.5", align === "end" ? "items-end" : "items-start")
        )}
      >
        <Button
          type="button"
          onClick={() => void toggleFollow()}
          disabled={submitting}
          size={compact ? "sm" : "default"}
          variant={following ? "outline" : "default"}
          className={
            following
              ? "h-8 gap-1.5 border-white/10 bg-white/5 px-3 text-xs text-zinc-200 sm:text-sm"
              : "h-8 gap-1.5 bg-violet-600 px-3 text-xs hover:bg-violet-500 sm:text-sm"
          }
        >
          {submitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : following ? (
            <UserMinus className="size-3.5" />
          ) : (
            <UserPlus className="size-3.5" />
          )}
          {following ? t("unfollowBtn") : t("followBtn")}
        </Button>
        {showFollowerCount && (
          <p
            className={cn(
              "text-xs text-zinc-500 sm:text-sm",
              align === "end" && "text-right"
            )}
          >
            {t("followerCount", { count: followerCount })}
          </p>
        )}
      </div>
      {actionError && (
        <p className="mt-1 max-w-[12rem] text-xs text-rose-300">{actionError}</p>
      )}
    </div>
  );
}
