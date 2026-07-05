"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";

export function PageViewTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        eventType: "page_view",
        path: pathname,
        locale,
      }),
    }).catch(() => undefined);
  }, [locale, pathname]);

  return null;
}
