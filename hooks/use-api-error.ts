"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { API_ERROR_KEY_BY_MESSAGE } from "@/lib/api-error-map";

export function useApiError() {
  const t = useTranslations("errors.api");

  const translateApiError = useCallback(
    (message: string | undefined | null) => {
      if (!message) return null;

      const exactKey = API_ERROR_KEY_BY_MESSAGE[message];
      if (exactKey) return t(exactKey);

      for (const [pattern, key] of Object.entries(API_ERROR_KEY_BY_MESSAGE)) {
        if (message.includes(pattern)) return t(key);
      }

      if (message.includes("封面圖不可超過")) return t("coverTooLargeGeneric");
      if (message.includes("遊戲 zip 不可超過")) return t("zipTooLargeGeneric");
      if (message.includes("無法連線 Supabase")) return t("supabaseConnection");
      if (message.includes("檔案超過 Supabase 大小上限")) return t("supabaseFileTooLarge");

      return null;
    },
    [t]
  );

  return { translateApiError };
}
