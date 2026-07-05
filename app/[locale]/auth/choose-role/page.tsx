import { Suspense } from "react";
import ChooseRolePage from "./choose-role-page";
import { AnalyticsFallbackScreen } from "@/components/analytics/google-analytics-provider";

export default function Page() {
  return (
    <Suspense fallback={<AnalyticsFallbackScreen />}>
      <ChooseRolePage />
    </Suspense>
  );
}
