import type { GameGenre } from "@/lib/game-metadata";
import type { GamePublishStatus } from "@/lib/game-publish";
import type { AiContentType } from "@/lib/game-metadata";
import type { GamePricingType } from "@/lib/game-pricing";
import { MAX_GAME_TAGS, RECOMMENDED_MIN_TAGS } from "@/lib/creator-tools/constants";
import { resolveGameSlugForSave } from "@/lib/game-slug";
import { pricingValuesRequireStripeConnect } from "@/lib/creator-stripe-gate";
import { MIN_SUGGESTED_TIP_USD } from "@/lib/tip-limits";

export type PublishChecklistItemId =
  | "title"
  | "slug"
  | "description"
  | "genre"
  | "cover"
  | "gameZip"
  | "tags"
  | "aiDisclosure"
  | "aiContentTypes"
  | "stripeConnect"
  | "pricing"
  | "tips"
  | "detailsHtml"
  | "viewport";

export type PublishChecklistStatus = "done" | "warning" | "missing" | "optional";

export type PublishChecklistItem = {
  id: PublishChecklistItemId;
  status: PublishChecklistStatus;
  required: boolean;
};

export type PublishChecklistInput = {
  mode: "upload" | "edit";
  publishStatus: GamePublishStatus;
  publishVersion?: boolean;
  title: string;
  slug: string;
  description: string;
  genre: GameGenre | "";
  hasCover: boolean;
  hasGameZip: boolean;
  tags: string[];
  aiDisclosed: boolean | null;
  aiContentTypes: AiContentType[];
  tipsEnabled: boolean;
  suggestedTipAmount: string;
  pricingType: GamePricingType;
  priceAmount: string;
  minPriceAmount: string;
  stripeConnectReady?: boolean;
  detailsHtml: string;
  viewportWidth: number;
  viewportHeight: number;
};

function isPricingValid(input: PublishChecklistInput): boolean {
  if (input.pricingType === "fixed") {
    const parsed = Number.parseFloat(input.priceAmount);
    return Number.isFinite(parsed) && parsed > 0;
  }
  if (input.pricingType === "pwyw") {
    const raw = input.minPriceAmount.trim() || "0";
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) && parsed >= 0;
  }
  return true;
}

function isTipsValid(input: PublishChecklistInput): boolean {
  if (!input.tipsEnabled) return true;
  const parsed = Number.parseFloat(input.suggestedTipAmount);
  return Number.isFinite(parsed) && parsed >= MIN_SUGGESTED_TIP_USD;
}

export function evaluatePublishChecklist(
  input: PublishChecklistInput
): PublishChecklistItem[] {
  const isPublic = input.publishStatus === "public";
  const slugOk = resolveGameSlugForSave({
    rawSlug: input.slug,
    title: input.title,
    requireSlug: isPublic,
  }).ok;

  const items: PublishChecklistItem[] = [
    {
      id: "title",
      status: input.title.trim() ? "done" : "missing",
      required: true,
    },
    {
      id: "slug",
      status: !isPublic ? "optional" : slugOk ? "done" : "missing",
      required: isPublic,
    },
    {
      id: "description",
      status: !isPublic
        ? "optional"
        : input.description.trim()
          ? "done"
          : "missing",
      required: isPublic,
    },
    {
      id: "genre",
      status: !isPublic ? "optional" : input.genre ? "done" : "missing",
      required: isPublic,
    },
    {
      id: "cover",
      status: !isPublic ? "optional" : input.hasCover ? "done" : "missing",
      required: isPublic,
    },
    {
      id: "gameZip",
      status:
        input.mode === "upload"
          ? input.hasGameZip
            ? "done"
            : "missing"
          : input.publishVersion
            ? input.hasGameZip
              ? "done"
              : "missing"
            : input.hasGameZip
              ? "done"
              : "optional",
      required:
        input.mode === "upload" ||
        Boolean(input.publishVersion) ||
        isPublic,
    },
    {
      id: "tags",
      status:
        input.tags.length >= RECOMMENDED_MIN_TAGS
          ? "done"
          : input.tags.length > 0
            ? "warning"
            : isPublic
              ? "warning"
              : "optional",
      required: false,
    },
    {
      id: "aiDisclosure",
      status: !isPublic
        ? "optional"
        : input.aiDisclosed !== null
          ? "done"
          : "missing",
      required: isPublic,
    },
    {
      id: "aiContentTypes",
      status:
        !isPublic || input.aiDisclosed !== true
          ? "optional"
          : input.aiContentTypes.length > 0
            ? "done"
            : "missing",
      required: isPublic && input.aiDisclosed === true,
    },
    {
      id: "stripeConnect",
      status:
        !isPublic ||
        !pricingValuesRequireStripeConnect({
          pricingType: input.pricingType,
        })
          ? "optional"
          : input.stripeConnectReady
            ? "done"
            : "missing",
      required:
        isPublic &&
        pricingValuesRequireStripeConnect({ pricingType: input.pricingType }),
    },
    {
      id: "pricing",
      status: isPricingValid(input) ? "done" : "missing",
      required:
        isPublic &&
        (input.pricingType === "fixed" || input.pricingType === "pwyw"),
    },
    {
      id: "tips",
      status: isTipsValid(input) ? "done" : "missing",
      required: isPublic && input.tipsEnabled,
    },
    {
      id: "detailsHtml",
      status: input.detailsHtml.trim() ? "done" : "warning",
      required: false,
    },
    {
      id: "viewport",
      status:
        input.viewportWidth >= 200 && input.viewportHeight >= 200
          ? "done"
          : "warning",
      required: false,
    },
  ];

  return items;
}

export function summarizePublishChecklist(items: PublishChecklistItem[]) {
  const required = items.filter((item) => item.required);
  const requiredDone = required.filter((item) => item.status === "done").length;
  const warnings = items.filter((item) => item.status === "warning").length;
  const missingRequired = required.filter((item) => item.status === "missing");
  const score = Math.round(
    (items.filter((item) => item.status === "done").length / items.length) * 100
  );
  const tagCount = items.find((item) => item.id === "tags");
  const tagScore =
    tagCount?.status === "done"
      ? 100
      : tagCount?.status === "warning"
        ? 55
        : 20;

  return {
    score,
    tagScore,
    requiredTotal: required.length,
    requiredDone,
    warnings,
    readyToPublish: missingRequired.length === 0,
    missingRequired,
    maxTags: MAX_GAME_TAGS,
  };
}
