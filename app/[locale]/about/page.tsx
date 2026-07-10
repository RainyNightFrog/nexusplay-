import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AboutView } from "./about-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");

  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
  };
}

export default function AboutPage() {
  return <AboutView />;
}
