"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserRound, UserX } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import { accountCardClassName, settingsListRowClassName } from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import type { FollowedCreator } from "@/lib/creator-follows-service";

export default function FollowingSettingsPage() {
  const t = useTranslations("accountSettings");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<FollowedCreator[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/following")
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/auth?redirect=/settings/following");
          return null;
        }
        return response.json();
      })
      .then((data: { creators?: FollowedCreator[] } | null) => {
        if (data) setCreators(data.creators ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleUnfollow(creatorId: string) {
    setRemovingId(creatorId);
    try {
      const response = await fetch(`/api/creators/${creatorId}/follow`, {
        method: "DELETE",
      });
      if (response.ok) {
        setCreators((current) => current.filter((item) => item.id !== creatorId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("followingTitle")}
        description={t("followingDesc")}
      />

      <div className={accountCardClassName}>
        {creators.length === 0 ? (
          <div className="py-12 text-center">
            <UserRound className="mx-auto size-10 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">{t("followingEmpty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {creators.map((creator) => (
              <li
                key={creator.id}
                className={settingsListRowClassName}
              >
                <Link
                  href={`/creator/${creator.id}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                    {creator.avatarUrl ? (
                      <Image
                        src={creator.avatarUrl}
                        alt={creator.displayName}
                        width={44}
                        height={44}
                        className="size-full object-cover"
                      />
                    ) : (
                      <UserRound className="size-5 text-violet-400" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate font-medium text-zinc-100">
                      {creator.displayName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(creator.followedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removingId === creator.id}
                  onClick={() => void handleUnfollow(creator.id)}
                  className="gap-1 text-zinc-400 hover:text-rose-300"
                >
                  {removingId === creator.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <UserX className="size-3.5" />
                  )}
                  {t("followingUnfollow")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
