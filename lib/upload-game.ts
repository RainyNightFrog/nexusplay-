import type { GamePublishStatus } from "@/lib/game-publish";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import { appendPublishMetadataToFormData } from "@/lib/game-metadata";
import { appendPricingToFormData, type GamePricingValues } from "@/lib/game-pricing";
import { readApiJson } from "@/lib/fetch-api-json";
import {
  createDirectUploadSession,
  uploadCoverDirect,
  uploadZipBuildDirect,
} from "@/lib/client-direct-upload";

export type UploadGameInput = {
  title: string;
  slug: string;
  description: string;
  category: string;
  coverFile: File | null;
  gameZipFile: File;
  publishStatus: GamePublishStatus;
  tipsEnabled: boolean;
  suggestedTipAmount: string;
  pricing: GamePricingValues;
  metadata: GamePublishMetadata;
};

export type UploadGameResult = {
  game: {
    id: number;
    title: string;
    description: string;
    category: string;
    cover_url: string;
    game_url: string;
    slug?: string | null;
    creator_id: string;
    created_at: string;
    publish_status: GamePublishStatus;
    tips_enabled: boolean;
    suggested_tip_amount: number | null;
    pricing_type?: "free" | "fixed" | "pwyw";
    price?: number;
    currency?: string;
    min_price?: number;
  };
};

export async function uploadGame(
  input: UploadGameInput,
  onProgress?: (message: string) => void
): Promise<UploadGameResult> {
  onProgress?.("正在準備直傳…");
  const session = await createDirectUploadSession();

  // 封面與 ZIP 建置並行，縮短總等待時間；任一方失敗時清掉已上傳封面
  let uploadedCoverPath: string | undefined;
  let cover: Awaited<ReturnType<typeof uploadCoverDirect>> | undefined;
  let build: Awaited<ReturnType<typeof uploadZipBuildDirect>>;
  try {
    [cover, build] = await Promise.all([
      input.coverFile
        ? uploadCoverDirect(input.coverFile, session.userId, onProgress).then(
            (result) => {
              uploadedCoverPath = result.path;
              return result;
            }
          )
        : Promise.resolve(undefined),
      uploadZipBuildDirect({
        file: input.gameZipFile,
        userId: session.userId,
        buildId: session.buildId,
        onProgress,
      }),
    ]);
  } catch (error) {
    if (uploadedCoverPath) {
      const { createClient } = await import("@/lib/supabase/client");
      const { COVERS_BUCKET, removeStoragePaths } = await import(
        "@/lib/game-storage"
      );
      await removeStoragePaths(createClient(), COVERS_BUCKET, [
        uploadedCoverPath,
      ]);
    }
    throw error;
  }

  onProgress?.("正在寫入遊戲資料…");

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("slug", input.slug);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("publishStatus", input.publishStatus);
  formData.append("tipsEnabled", String(input.tipsEnabled));
  if (input.tipsEnabled && input.suggestedTipAmount.trim()) {
    formData.append("suggestedTipAmount", input.suggestedTipAmount.trim());
  }
  appendPricingToFormData(formData, input.pricing);
  appendPublishMetadataToFormData(formData, input.metadata);

  formData.append("directBuildId", session.buildId);
  formData.append("directBuildToken", session.token);
  formData.append("directIndexPath", build.indexPath);
  if (cover?.path) {
    formData.append("directCoverPath", cover.path);
  }

  const response = await fetch("/api/games/upload", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });

  const payload = await readApiJson<UploadGameResult>(response);

  if (!response.ok) {
    throw new Error(payload.error ?? "上傳失敗，請稍後再試");
  }

  return { game: payload.game };
}
