import type { GamePublishStatus } from "@/lib/game-publish";

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
  };
};

export type ManageGameRecord = UpdateGameResult["game"] & {
  isOrphan?: boolean;
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

  const payload = (await response.json()) as {
    game?: ManageGameRecord;
    isOrphan?: boolean;
    error?: string;
  };

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

  if (input.coverFile) {
    formData.append("cover", input.coverFile);
  }
  if (input.gameZipFile) {
    formData.append("gameZip", input.gameZipFile);
  }

  onProgress?.(
    input.publishVersion ? "正在發布新版本..." : "正在儲存變更..."
  );

  const response = await fetch(`/api/games/${gameId}`, {
    method: "PATCH",
    credentials: "same-origin",
    body: formData,
  });

  const payload = (await response.json()) as UpdateGameResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "更新失敗，請稍後再試");
  }

  if (!payload.game) {
    throw new Error("更新失敗，請稍後再試");
  }

  return { game: payload.game };
}
