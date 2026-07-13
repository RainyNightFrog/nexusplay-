"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Archive,
  BarChart3,
  Calculator,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublishChecklistPanel } from "@/components/creator-tools/publish-checklist-panel";
import { RevenueCalculatorPanel } from "@/components/creator-tools/revenue-calculator-panel";
import { PricingReferencePanel } from "@/components/creator-tools/pricing-reference-panel";
import { StorePreviewPanel } from "@/components/creator-tools/store-preview-panel";
import { SdkCheckerPanel } from "@/components/creator-tools/sdk-checker-panel";
import { DevlogTemplatesPanel } from "@/components/creator-tools/devlog-templates-panel";
import { ZipInspectorPanel } from "@/components/creator-tools/zip-inspector-panel";
import { DEFAULT_GAME_PUBLISH_METADATA } from "@/lib/game-metadata";
import { DEFAULT_PUBLISH_STATUS } from "@/lib/game-publish";
import { defaultGamePricingValues } from "@/lib/game-pricing";
import { cn } from "@/lib/utils";

export default function CreatorToolsPage() {
  const t = useTranslations("creatorTools");
  const tCommon = useTranslations("common");
  const tDash = useTranslations("dashboard");

  const [previewZip, setPreviewZip] = useState<File | null>(null);
  const [sdkSignals, setSdkSignals] = useState<string[]>([]);

  const demoChecklist = {
    mode: "upload" as const,
    publishStatus: DEFAULT_PUBLISH_STATUS,
    title: "",
    slug: "",
    description: "",
    genre: "" as const,
    hasCover: false,
    hasGameZip: Boolean(previewZip),
    tags: DEFAULT_GAME_PUBLISH_METADATA.tags,
    aiDisclosed: null,
    aiContentTypes: [],
    tipsEnabled: false,
    suggestedTipAmount: "",
    pricingType: defaultGamePricingValues().pricingType,
    priceAmount: "",
    minPriceAmount: "",
    detailsHtml: "",
    viewportWidth: DEFAULT_GAME_PUBLISH_METADATA.viewportWidth,
    viewportHeight: DEFAULT_GAME_PUBLISH_METADATA.viewportHeight,
  };

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-cyan-300"
          )}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{tCommon("backDashboard")}</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
            <Wrench className="size-4 text-white" />
          </div>
          <span className="truncate text-sm font-semibold text-white">{t("pageTitle")}</span>
        </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="size-3.5" />
              {t("pageBadge")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {t("pageHeading")}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {t("pageDesc")}
            </p>
          </div>

          <Tabs defaultValue="checklist" className="space-y-6">
            <TabsList className="mx-auto flex h-auto w-full max-w-4xl flex-wrap justify-center gap-1 bg-zinc-900/80 p-1.5">
              <TabsTrigger value="checklist" className="gap-1.5 text-xs sm:text-sm">
                <CheckCircle2 className="size-3.5" />
                {t("tabChecklist")}
              </TabsTrigger>
              <TabsTrigger value="revenue" className="gap-1.5 text-xs sm:text-sm">
                <Calculator className="size-3.5" />
                {t("tabRevenue")}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="size-3.5" />
                {t("tabPricing")}
              </TabsTrigger>
              <TabsTrigger value="zip" className="gap-1.5 text-xs sm:text-sm">
                <Archive className="size-3.5" />
                {t("tabZip")}
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-xs sm:text-sm">
                <Eye className="size-3.5" />
                {t("tabPreview")}
              </TabsTrigger>
              <TabsTrigger value="sdk" className="gap-1.5 text-xs sm:text-sm">
                <Code2 className="size-3.5" />
                {t("tabSdk")}
              </TabsTrigger>
              <TabsTrigger value="devlog" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="size-3.5" />
                {t("tabDevlog")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist">
              <PublishChecklistPanel input={demoChecklist} />
              <p className="mt-4 text-center text-xs text-zinc-500">{t("checklistUploadHint")}</p>
            </TabsContent>

            <TabsContent value="revenue">
              <RevenueCalculatorPanel />
            </TabsContent>

            <TabsContent value="pricing">
              <PricingReferencePanel />
            </TabsContent>

            <TabsContent value="zip" className="space-y-4">
              <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-900/40 p-6 text-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setPreviewZip(file);
                      e.target.value = "";
                    }}
                  />
                  <span className="text-sm text-cyan-300 hover:text-cyan-200">
                    {tDash("gameZip")} — {t("zipUploadHint")}
                  </span>
                </label>
              </div>
              <ZipInspectorPanel
                file={previewZip}
                onReport={(report) => setSdkSignals(report?.sdkSignals ?? [])}
              />
            </TabsContent>

            <TabsContent value="preview">
              <StorePreviewPanel
                title={t("previewDemoTitle")}
                description={t("previewDemoDesc")}
                genre=""
                tags={[]}
              />
            </TabsContent>

            <TabsContent value="sdk">
              <SdkCheckerPanel sdkSignals={sdkSignals} />
            </TabsContent>

            <TabsContent value="devlog">
              <DevlogTemplatesPanel />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
