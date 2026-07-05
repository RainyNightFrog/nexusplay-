import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomePageClient } from "@/components/home/home-page-client";
import { JsonLd } from "@/components/seo/json-ld";
import { buildOpenGraphMetadata } from "@/lib/page-metadata";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/structured-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("seo");

  return buildOpenGraphMetadata({
    title: t("homeTitle"),
    description: t("homeDescription"),
    locale,
    path: "/",
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <>
      <JsonLd
        data={[
          buildWebSiteJsonLd(locale),
          buildOrganizationJsonLd(),
        ]}
      />
      <HomePageClient />
    </>
  );
}
