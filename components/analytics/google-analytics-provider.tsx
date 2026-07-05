import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

function AnalyticsFallback() {
  return null;
}

export function GoogleAnalyticsProvider() {
  return (
    <Suspense fallback={<AnalyticsFallback />}>
      <GoogleAnalytics />
    </Suspense>
  );
}

export function AnalyticsFallbackScreen() {
  return (
    <div className="dark flex min-h-full items-center justify-center">
      <Loader2 className="size-8 animate-spin text-cyan-400" />
    </div>
  );
}
