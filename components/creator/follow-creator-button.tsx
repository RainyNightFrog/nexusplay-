"use client";

import { useEffect, useState } from "react";
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
};

export function FollowCreatorButton({
  creatorId,
  initialFollowing = false,
  initialFollowerCount = 0,
  className,
  compact = false,
  showFollowerCount = true,
  centered = false,
}: FollowCreatorButtonProps) {
  const t = useTranslations("creatorPublic");
  const router = useRouter();
  const { profile } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
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
  }, [creatorId]);

  if (profile?.id === creatorId) {
    if (!showFollowerCount) return null;
    return (
      <p className={cn("text-sm text-zinc-500", className)}>
        {t("followerCount", { count: followerCount })}
      </p>
    );
  }

  async function toggleFollow() {
    if (!profile) {
      router.push(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setSubmitting(true);
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
    } catch {
      // keep current state
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        centered ? "flex flex-col items-center" : "",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          centered && "justify-center"
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
              ? "gap-2 border-white/10 bg-white/5 text-zinc-200"
              : "gap-2 bg-violet-600 hover:bg-violet-500"
          }
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : following ? (
            <UserMinus className="size-4" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {following ? t("unfollowBtn") : t("followBtn")}
        </Button>
        {showFollowerCount && (
          <p className="text-sm text-zinc-500">
            {t("followerCount", { count: followerCount })}
          </p>
        )}
      </div>
    </div>
  );
}
