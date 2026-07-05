import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FeedsHub } from "@/components/feeds/feeds-hub";
import { buildOpenGraphMetadata } from "@/lib/page-metadata";
import { platformGamesFeedAlternates } from "@/lib/feed-discovery";
import { getFeedStats } from "@/lib/feed-stats-service";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("feeds");

  return buildOpenGraphMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/feeds",
    feedAlternates: platformGamesFeedAlternates(),
  });
}

export default async function FeedsPage() {
  const stats = await getFeedStats();
  return <FeedsHub stats={stats} />;
}
