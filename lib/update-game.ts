import type { GamePublishStatus } from "@/lib/game-publish";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import { appendPublishMetadataToFormData } from "@/lib/game-metadata";
import { appendPricingToFormData, type GamePricingValues } from "@/lib/game-pricing";
import { readApiJson } from "@/lib/fetch-api-json";
import {
  cleanupDirectUploadArtifacts,
  createDirectUploadSession,
  uploadCoverDirect,
  uploadZipBuildDirect,
} from "@/lib/client-direct-upload";

import {
  MAX_DEVLOG_CONTENT_LENGTH,
  MAX_DEVLOG_TITLE_LENGTH,
  MAX_GALLERY_IMAGES,
} from "@/lib/game-page-content";
import {
  formatMaxSize,
  PRODUCTION_FORMDATA_SAFE_BYTES,
} from "@/lib/upload-limits";

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
  pricing: GamePricingValues;
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
    status?: "pending" | "approved" | "rejected";
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
    pricing_type?: "free" | "fixed" | "pwyw";
    price?: number;
    currency?: string;
    min_price?: number;
    on_sale?: boolean;
  };
};

export type ManageGameRecord = UpdateGameResult["game"] & {
  slug?: string | null;
  isOrphan?: boolean;
  platform_fee_percent?: number | null;
  is_upcoming?: boolean;
  rejection_reason?: string | null;
};

function appendMonetizationFields(
  formData: FormData,
  input: Pick<
    UpdateGameInput,
    "publishStatus" | "tipsEnabled" | "suggestedTipAmount" | "pricing"
  >
) {
  formData.append("publishStatus", input.publishStatus);
  formData.append("tipsEnabled", String(input.tipsEnabled));
  if (input.tipsEnabled && input.suggestedTipAmount.trim()) {
    formData.append("suggestedTipAmount", input.suggestedTipAmount.trim());
  }
  appendPricingToFormData(formData, input.pricing);
}

export async function fetchManageGame(
  gameId: number
): Promise<{ game: ManageGameRecord; isOrphan: boolean }> {
  const response = await fetch(`/api/games/${gameId}/manage`, {
    credentials: "same-origin",
  });

  const payload = await readApiJson<{
    game?: ManageGameRecord;
    isOrphan?: boolean;
  }>(response);

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

  const formDataBytes =
    (input.galleryFiles ?? []).reduce((sum, file) => sum + file.size, 0) +
    (input.devlogImageFiles ?? []).reduce((sum, file) => sum + file.size, 0);

  if (formDataBytes > PRODUCTION_FORMDATA_SAFE_BYTES) {
    throw new Error(
      `圖庫／更新配圖合計不可超過約 ${formatMaxSize(PRODUCTION_FORMDATA_SAFE_BYTES)}（目前 ${formatMaxSize(formDataBytes)}）。請減少張數或壓縮後再試。`
    );
  }

  const needsDirectAssets = Boolean(input.coverFile || input.gameZipFile);
  let directCoverPath: string | undefined;
  let directBuildId: string | undefined;
  let directBuildToken: string | undefined;
  let directIndexPath: string | undefined;

  if (needsDirectAssets) {
    onProgress?.("正在準備直傳…");
    const session = await createDirectUploadSession();

    let uploadedCoverPath: string | undefined;
    const shouldCleanupBuild = Boolean(input.gameZipFile);

    try {
      const [cover, build] = await Promise.all([
        input.coverFile
          ? uploadCoverDirect(input.coverFile, session.userId, onProgress).then(
              (result) => {
                uploadedCoverPath = result.path;
                return result;
              }
            )
          : Promise.resolve(undefined),
        input.gameZipFile
          ? uploadZipBuildDirect({
              file: input.gameZipFile,
              userId: session.userId,
              buildId: session.buildId,
              onProgress,
            })
          : Promise.resolve(undefined),
      ]);

      if (cover?.path) {
        directCoverPath = cover.path;
      }
      if (build) {
        directBuildId = session.buildId;
        directBuildToken = session.token;
        directIndexPath = build.indexPath;
      }
    } catch (error) {
      await cleanupDirectUploadArtifacts({
        userId: session.userId,
        buildId: shouldCleanupBuild ? session.buildId : undefined,
        coverPath: uploadedCoverPath,
      });
      throw error;
    }
  }

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("publishVersion", String(input.publishVersion ?? false));
  appendMonetizationFields(formData, input);
  appendPublishMetadataToFormData(formData, input.metadata);

  if (directCoverPath) {
    formData.append("directCoverPath", directCoverPath);
  }
  if (directBuildId && directBuildToken && directIndexPath) {
    formData.append("directBuildId", directBuildId);
    formData.append("directBuildToken", directBuildToken);
    formData.append("directIndexPath", directIndexPath);
  }

  formData.append("galleryUrls", JSON.stringify(input.galleryUrls ?? []));
  for (const file of input.galleryFiles ?? []) {
    formData.append("galleryImages", file);
  }

  if (input.publishVersion) {
    if (input.devlogTitle?.trim()) {
      formData.append(
        "devlogTitle",
        input.devlogTitle.trim().slice(0, MAX_DEVLOG_TITLE_LENGTH)
      );
    }
    if (input.devlogContent?.trim()) {
      formData.append(
        "devlogContent",
        input.devlogContent.trim().slice(0, MAX_DEVLOG_CONTENT_LENGTH)
      );
    }
    for (const file of (input.devlogImageFiles ?? []).slice(
      0,
      MAX_GALLERY_IMAGES
    )) {
      formData.append("devlogImages", file);
    }
  }

  onProgress?.(
    input.publishVersion ? "正在發布新版本..." : "正在儲存變更..."
  );

  // finalize 失敗清理由伺服器負責，避免「已成功但回應丟失」時 client 誤刪上架資產
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
