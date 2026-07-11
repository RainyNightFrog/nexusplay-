import { GAME_TAGS, type GameTag } from "@/lib/game-metadata";

const TAG_SET = new Set<string>(GAME_TAGS);

/** 解析首頁/API 的 tag 查詢參數（支援 ?tag=A&tag=B 或 ?tags=A,B） */
export function parseGameTagsParam(
  searchParams: URLSearchParams
): GameTag[] {
  const fromRepeated = searchParams.getAll("tag").map((value) => value.trim());
  const fromCsv = (searchParams.get("tags") ?? "")
    .split(",")
    .map((value) => value.trim());

  const merged = [...fromRepeated, ...fromCsv].filter(Boolean);
  const valid = merged.filter((tag): tag is GameTag =>
    TAG_SET.has(tag)
  );

  return [...new Set(valid)];
}

export function appendGameTagsToSearchParams(
  params: URLSearchParams,
  tags: readonly string[]
) {
  for (const tag of tags) {
    if (TAG_SET.has(tag)) {
      params.append("tag", tag);
    }
  }
}
