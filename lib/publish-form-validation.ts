import type { GameGenre } from "@/lib/game-metadata";
import type { GamePublishStatus } from "@/lib/game-publish";
import type { AiContentType } from "@/lib/game-metadata";

export type PublishFormValidationInput = {
  mode: "upload" | "edit";
  publishStatus: GamePublishStatus;
  publishVersion?: boolean;
  title: string;
  description: string;
  genre: GameGenre | "";
  hasCover: boolean;
  hasGameZip: boolean;
  aiDisclosed: boolean | null;
  aiContentTypes: AiContentType[];
  tipsEnabled: boolean;
  suggestedTipAmount: string;
};

export type PublishValidationField =
  | "title"
  | "description"
  | "genre"
  | "cover"
  | "gameZip"
  | "aiDisclosure"
  | "aiContentTypes"
  | "suggestedTip";

export type PublishValidationIssue = {
  field: PublishValidationField;
  messageKey: string;
};

export function getPublishValidationIssues(
  input: PublishFormValidationInput
): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = [];
  const isPublic = input.publishStatus === "public";
  const isDraft = !isPublic;

  if (!input.title.trim()) {
    issues.push({ field: "title", messageKey: "alertTitle" });
  }

  if (isDraft) {
    if (input.mode === "upload" && !input.hasGameZip) {
      issues.push({ field: "gameZip", messageKey: "alertZip" });
    }
    if (input.tipsEnabled && !input.suggestedTipAmount.trim()) {
      issues.push({ field: "suggestedTip", messageKey: "alertSuggestedTip" });
    }
    return issues;
  }

  if (!input.description.trim()) {
    issues.push({ field: "description", messageKey: "alertDesc" });
  }
  if (!input.genre) {
    issues.push({ field: "genre", messageKey: "alertCategory" });
  }
  if (!input.hasCover) {
    issues.push({ field: "cover", messageKey: "alertCover" });
  }
  if (input.mode === "upload" && !input.hasGameZip) {
    issues.push({ field: "gameZip", messageKey: "alertZip" });
  }
  if (input.mode === "edit" && input.publishVersion && !input.hasGameZip) {
    issues.push({ field: "gameZip", messageKey: "missingZip" });
  }
  if (input.aiDisclosed === null) {
    issues.push({ field: "aiDisclosure", messageKey: "alertAiDisclosure" });
  }
  if (input.aiDisclosed === true && input.aiContentTypes.length === 0) {
    issues.push({ field: "aiContentTypes", messageKey: "alertAiContentTypes" });
  }
  if (input.tipsEnabled && !input.suggestedTipAmount.trim()) {
    issues.push({ field: "suggestedTip", messageKey: "alertSuggestedTip" });
  }

  return issues;
}

export const PUBLIC_REQUIRED_FIELD_KEYS = [
  "gameTitle",
  "gameDesc",
  "genreRequired",
  "coverImage",
  "gameZip",
  "aiDisclosureRequired",
] as const;

export const DRAFT_REQUIRED_FIELD_KEYS = ["gameTitle", "gameZip"] as const;
