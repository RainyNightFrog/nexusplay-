import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  unsubscribeForumDigestEmail,
  type ForumDigestUnsubscribeResult,
} from "@/lib/forum-digest-unsubscribe";
import { verifyEmailUnsubscribeToken } from "@/lib/email-unsubscribe-token";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

async function resolveUnsubscribe(
  token: string | undefined
): Promise<ForumDigestUnsubscribeResult> {
  if (!token?.trim()) return "invalid";

  let verified: ReturnType<typeof verifyEmailUnsubscribeToken>;
  try {
    verified = verifyEmailUnsubscribeToken(token.trim());
  } catch {
    return "misconfigured";
  }

  if (!verified) return "invalid";

  try {
    return await unsubscribeForumDigestEmail(verified.userId);
  } catch {
    return "invalid";
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("unsubscribe");
  return {
    title: t("forumDigestTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function UnsubscribeForumDigestPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const t = await getTranslations("unsubscribe");
  const result = await resolveUnsubscribe(token);

  const messageKey =
    result === "success"
      ? "forumDigestSuccess"
      : result === "already"
        ? "forumDigestAlready"
        : result === "misconfigured"
          ? "forumDigestMisconfigured"
          : "forumDigestInvalid";

  return (
    <div className="dark flex min-h-full items-center justify-center bg-zinc-950 px-4 py-16 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/70 p-8 text-center">
        <h1 className="text-xl font-semibold text-white">{t("forumDigestTitle")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{t(messageKey)}</p>
        <Link
          href="/settings"
          className="mt-6 inline-block text-sm text-violet-400 hover:text-violet-300"
        >
          {t("manageSettings")}
        </Link>
      </div>
    </div>
  );
}
