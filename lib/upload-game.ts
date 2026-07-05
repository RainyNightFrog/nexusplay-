import type { GamePublishStatus } from "@/lib/game-publish";
import type { GamePublishMetadata } from "@/lib/game-metadata";
import { appendPublishMetadataToFormData } from "@/lib/game-metadata";

export type UploadGameInput = {
  title: string;
  description: string;
  category: string;
  coverFile: File;
  gameZipFile: File;
  publishStatus: GamePublishStatus;
  tipsEnabled: boolean;
  suggestedTipAmount: string;
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
    creator_id: string;
    created_at: string;
    publish_status: GamePublishStatus;
    tips_enabled: boolean;
    suggested_tip_amount: number | null;
  };
};

export async function uploadGame(
  input: UploadGameInput,
  onProgress?: (message: string) => void
): Promise<UploadGameResult> {
  onProgress?.("正在上傳封面圖...");

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("cover", input.coverFile);
  formData.append("gameZip", input.gameZipFile);
  formData.append("publishStatus", input.publishStatus);
  formData.append("tipsEnabled", String(input.tipsEnabled));
  if (input.tipsEnabled && input.suggestedTipAmount.trim()) {
    formData.append("suggestedTipAmount", input.suggestedTipAmount.trim());
  }
  appendPublishMetadataToFormData(formData, input.metadata);

  onProgress?.("正在上傳遊戲壓縮檔...");

  const response = await fetch("/api/games/upload", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });

  onProgress?.("正在寫入資料庫...");

  const payload = (await response.json()) as UploadGameResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "上傳失敗，請稍後再試");
  }

  return { game: payload.game };
}
