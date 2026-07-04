export type CreatorGameRecord = {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_url: string;
  game_url: string;
  creator_id: string | null;
  created_at: string;
  plays_count: number;
  rating_avg: number;
  isUnclaimed?: boolean;
  publish_status: "draft" | "public";
  tips_enabled: boolean;
  suggested_tip_amount: number | null;
};

export async function fetchCreatorGames(): Promise<CreatorGameRecord[]> {
  const response = await fetch("/api/games/mine", {
    credentials: "same-origin",
  });

  const payload = (await response.json()) as {
    games?: CreatorGameRecord[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "讀取創作者遊戲失敗");
  }

  return payload.games ?? [];
}
