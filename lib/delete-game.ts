export async function deleteGame(gameId: number): Promise<void> {
  const response = await fetch(`/api/games/${gameId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "刪除遊戲失敗");
  }
}
