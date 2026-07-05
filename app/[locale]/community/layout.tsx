import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildOpenGraphMetadata } from "@/lib/page-metadata";
import { forumFeedAlternates } from "@/lib/feed-discovery";

type Props = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("seo");

  return buildOpenGraphMetadata({
    title: t("communityTitle"),
    description: t("communityDescription"),
    locale,
    path: "/community",
    feedAlternates: forumFeedAlternates(),
  });
}

export default function CommunityLayout({ children }: Props) {
  return children;
}
