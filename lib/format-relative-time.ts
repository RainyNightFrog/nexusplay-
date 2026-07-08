export type RelativeTimeTranslator = (
  key: "timeJustNow" | "timeMinutes" | "timeHours" | "timeDays",
  values?: { count: number }
) => string;

export function formatRelativeTimeFromIso(
  iso: string | null,
  t: RelativeTimeTranslator,
  locale: string
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("timeJustNow");
  if (minutes < 60) return t("timeMinutes", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("timeHours", { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 7) return t("timeDays", { count: days });

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}
