/** 合併本機與雲端存檔：數字取較大、物件遞迴合併、其餘以雲端為基礎補本機缺欄 */
export function mergeGameSaves(
  local: Record<string, unknown> | null | undefined,
  cloud: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!local && !cloud) return null;
  if (!local) return cloud ? { ...cloud } : null;
  if (!cloud) return { ...local };

  const result: Record<string, unknown> = { ...cloud };

  for (const [key, localVal] of Object.entries(local)) {
    const cloudVal = result[key];

    if (typeof localVal === "number" && typeof cloudVal === "number") {
      result[key] = Math.max(localVal, cloudVal);
      continue;
    }

    if (
      localVal &&
      cloudVal &&
      typeof localVal === "object" &&
      typeof cloudVal === "object" &&
      !Array.isArray(localVal) &&
      !Array.isArray(cloudVal)
    ) {
      result[key] =
        mergeGameSaves(
          localVal as Record<string, unknown>,
          cloudVal as Record<string, unknown>
        ) ?? cloudVal;
      continue;
    }

    if (cloudVal === undefined) {
      result[key] = localVal;
    }
  }

  return result;
}

export function readJsonFromLocalStorage(key: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
