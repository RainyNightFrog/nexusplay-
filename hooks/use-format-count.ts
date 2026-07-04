"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatCompactCount } from "@/lib/format-count";

export function useFormatCount() {
  const locale = useLocale();
  const t = useTranslations("common");

  const formatCount = useCallback(
    (count: number) => formatCompactCount(count, locale, t("newListing")),
    [locale, t]
  );

  return { formatCount };
}
