import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SupporterView } from "./supporter-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("supporter");

  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
  };
}

export default function SupporterPage() {
  return (
    <Suspense fallback={null}>
      <SupporterView />
    </Suspense>
  );
}
