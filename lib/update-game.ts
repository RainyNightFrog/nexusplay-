import type { GamePublishStatus } from "@/lib/game-publish";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import { appendPublishMetadataToFormData } from "@/lib/game-metadata";

import {
  MAX_DEVLOG_CONTENT_LENGTH,
  MAX_DEVLOG_TITLE_LENGTH,
  MAX_GALLERY_IMAGES,
} from "@/lib/game-page-content";
import { readApiJson } from "@/lib/fetch-api-json";

export type UpdateGameInput = {
  title: string;
  description: string;
  category: string;
  coverFile?: File | null;
  gameZipFile?: File | null;
  publishVersion?: boolean;
  publishStatus: GamePublishStatus;
  tipsEnabled: boolean;
  suggestedTipAmount: string;
  galleryUrls?: string[];
  galleryFiles?: File[];
  devlogTitle?: string;
  devlogContent?: string;
  devlogImageFiles?: File[];
  metadata: GamePublishMetadata;
};

export type UpdateGameResult = {
  game: {
    id: number;
    title: string;
    description: string;
    category: string;
    cover_url: string;
    game_url: string;
    creator_id: string | null;
    created_at: string;
    publish_status: GamePublishStatus;
    tips_enabled: boolean;
    suggested_tip_amount: number | null;
    gallery_urls?: unknown;
    devlog_entries?: unknown;
    tags?: unknown;
    viewport_width?: number;
    viewport_height?: number;
    fullscreen_button?: boolean;
    ai_disclosed?: boolean | null;
    ai_content_types?: unknown;
    details_html?: string;
    platform_fee_percent?: number | null;
  };
};

export type ManageGameRecord = UpdateGameResult["game"] & {
  isOrphan?: boolean;
  platform_fee_percent?: number | null;
};

function appendMonetizationFields(
  formData: FormData,
  input: Pick<
    UpdateGameInput,
    "publishStatus" | "tipsEnabled" | "suggestedTipAmount"
  >
) {
  formData.append("publishStatus", input.publishStatus);
  formData.append("tipsEnabled", String(input.tipsEnabled));
  if (input.tipsEnabled && input.suggestedTipAmount.trim()) {
    formData.append("suggestedTipAmount", input.suggestedTipAmount.trim());
  }
}

export async function fetchManageGame(
  gameId: number
): Promise<{ game: ManageGameRecord; isOrphan: boolean }> {
  const response = await fetch(`/api/games/${gameId}/manage`, {
    credentials: "same-origin",
  });

  const payload = await readApiJson<{ game?: ManageGameRecord; isOrphan?: boolean }>(
    response
  );

  if (!response.ok) {
    throw new Error(payload.error ?? "讀取遊戲資料失敗");
  }

  if (!payload.game) {
    throw new Error("讀取遊戲資料失敗");
  }

  return { game: payload.game, isOrphan: payload.isOrphan ?? false };
}

export async function updateGame(
  gameId: number,
  input: UpdateGameInput,
  onProgress?: (message: string) => void
): Promise<UpdateGameResult> {
  onProgress?.("正在準備更新...");

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("publishVersion", String(input.publishVersion ?? false));
  appendMonetizationFields(formData, input);
  appendPublishMetadataToFormData(formData, input.metadata);

  if (input.coverFile) {
    formData.append("cover", input.coverFile);
  }
  if (input.gameZipFile) {
    formData.append("gameZip", input.gameZipFile);
  }

  formData.append(
    "galleryUrls",
    JSON.stringify(input.galleryUrls ?? [])
  );
  for (const file of input.galleryFiles ?? []) {
    formData.append("galleryImages", file);
  }

  if (input.publishVersion) {
    if (input.devlogTitle?.trim()) {
      formData.append("devlogTitle", input.devlogTitle.trim());
    }
    if (input.devlogContent?.trim()) {
      formData.append("devlogContent", input.devlogContent.trim());
    }
    for (const file of input.devlogImageFiles ?? []) {
      formData.append("devlogImages", file);
    }
  }

  onProgress?.(
    input.publishVersion ? "正在發布新版本..." : "正在儲存變更..."
  );

  const response = await fetch(`/api/games/${gameId}/update`, {
    method: "PATCH",
    credentials: "same-origin",
    body: formData,
  });

  const payload = await readApiJson<UpdateGameResult>(response);

  if (!response.ok) {
    throw new Error(payload.error ?? "更新失敗，請稍後再試");
  }

  if (!payload.game) {
    throw new Error("更新失敗，請稍後再試");
  }

  return { game: payload.game };
}
