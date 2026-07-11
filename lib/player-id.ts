export function formatPlayerNumber(
  playerNumber: number | string | null | undefined
): string | null {
  if (playerNumber == null) return null;
  const numeric =
    typeof playerNumber === "number"
      ? playerNumber
      : Number.parseInt(String(playerNumber), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return String(Math.trunc(numeric));
}

export function formatPlayerIdLabel(
  playerNumber: number | string | null | undefined
): string | null {
  return formatPlayerNumber(playerNumber);
}
