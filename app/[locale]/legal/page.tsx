import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPlatformModeStatus } from "@/lib/platform-mode";
import { LegalView } from "./legal-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");

  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
  };
}

export default function LegalPage() {
  const { paymentsLive } = getPlatformModeStatus();

  return <LegalView paymentsLive={paymentsLive} />;
}
