import {
  GAME_GENRES,
  GAME_TAGS,
  type GameGenre,
  type GameTag,
} from "@/lib/game-metadata";
import { RECOMMENDED_MIN_TAGS, TAG_COVERAGE_FULL } from "@/lib/creator-tools/constants";

/** 關鍵字 → 標籤對照（中英混合，依標題／描述比對） */
const TAG_KEYWORD_MAP: ReadonlyArray<{ tag: GameTag; keywords: string[] }> = [
  { tag: "像素風", keywords: ["像素", "pixel", "8-bit", "16-bit", "retro"] },
  { tag: "Roguelike", keywords: ["roguelike", "rogue-like", "肉鴿", "隨機地圖"] },
  { tag: "Roguelite", keywords: ["roguelite", "meta", "永久升級"] },
  { tag: "回合制", keywords: ["回合", "turn-based", "turn based"] },
  { tag: "塔防元素", keywords: ["塔防", "tower defense", "towerdefense"] },
  { tag: "卡牌構築", keywords: ["卡牌", "deck", "card game", "構築"] },
  { tag: "解謎機制", keywords: ["解謎", "puzzle", "謎題"] },
  { tag: "恐怖氛圍", keywords: ["恐怖", "horror", "驚悚", "scary"] },
  { tag: "賽博朋克", keywords: ["賽博", "cyberpunk", "cyber", "霓虹"] },
  { tag: "霓虹", keywords: ["neon", "霓虹"] },
  { tag: "科幻", keywords: ["科幻", "sci-fi", "scifi", "太空", "space"] },
  { tag: "奇幻", keywords: ["奇幻", "fantasy", "魔法", "magic", "龍"] },
  { tag: "武俠", keywords: ["武俠", "wuxia", "江湖", "劍"] },
  { tag: "中式古風", keywords: ["古風", "國風", "chinese", "水墨"] },
  { tag: "水墨風", keywords: ["水墨", "ink"] },
  { tag: "動漫風", keywords: ["動漫", "anime", "二次元"] },
  { tag: "日系", keywords: ["日系", "japanese", "jrpg"] },
  { tag: "放置", keywords: ["放置", "idle", "掛機"] },
  { tag: "生存", keywords: ["生存", "survival", "求生"] },
  { tag: "建造", keywords: ["建造", "build", "craft", "crafting"] },
  { tag: "沙盒建造", keywords: ["沙盒", "sandbox"] },
  { tag: "開放世界", keywords: ["開放世界", "open world"] },
  { tag: "程序生成", keywords: ["程序生成", "procedural", "隨機生成"] },
  { tag: "割草", keywords: ["割草", "bullet hell", "彈幕"] },
  { tag: "快節奏", keywords: ["快節奏", "fast-paced", "爽快"] },
  { tag: "慢節奏", keywords: ["慢節奏", "relax", "治癒", "治愈"] },
  { tag: "輕鬆治愈", keywords: ["治愈", "治癒", "cozy", "chill"] },
  { tag: "高難度", keywords: ["高難", "hardcore", "硬核", "困難"] },
  { tag: "硬核", keywords: ["硬核", "hardcore"] },
  { tag: "劇情豐富", keywords: ["劇情", "story", "narrative", "視覺小說"] },
  { tag: "戀愛", keywords: ["戀愛", "romance", "galgame", "乙女"] },
  { tag: "2D", keywords: ["2d", "平面", "橫版"] },
  { tag: "3D", keywords: ["3d", "立體"] },
  { tag: "橫向捲軸", keywords: ["橫向", "platformer", "平台跳躍", "side-scroll"] },
  { tag: "俯視角", keywords: ["俯視", "top-down", "top down"] },
  { tag: "第一人稱", keywords: ["第一人稱", "fps", "first person"] },
  { tag: "第三人稱", keywords: ["第三人稱", "third person"] },
  { tag: "WebGL", keywords: ["webgl", "three.js", "threejs", "unity web"] },
  { tag: "單機", keywords: ["單機", "single player", "solo"] },
  { tag: "多人對戰", keywords: ["多人", "multiplayer", "pvp", "對戰"] },
  { tag: "合作", keywords: ["合作", "co-op", "coop"] },
  { tag: "觸控友善", keywords: ["觸控", "touch", "手機", "mobile"] },
  { tag: "手把支援", keywords: ["手把", "gamepad", "controller"] },
  { tag: "可愛", keywords: ["可愛", "cute", "kawaii"] },
  { tag: "搞笑", keywords: ["搞笑", "funny", "幽默", "comedy"] },
  { tag: "教育", keywords: ["教育", "educational", "學習"] },
  { tag: "快節奏", keywords: ["節奏", "rhythm", "音遊", "音樂遊戲", "音樂節奏"] },
];

const GENRE_TAG_HINTS: Partial<Record<GameGenre, GameTag[]>> = {
  動作: ["快節奏", "硬核", "2D"],
  冒險: ["劇情豐富", "開放世界", "2D"],
  射擊: ["快節奏", "俯視角", "割草"],
  平台跳躍: ["2D", "橫向捲軸", "快節奏"],
  格鬥: ["快節奏", "2D", "競技"],
  RPG: ["回合制", "劇情豐富", "奇幻"],
  策略: ["回合制", "即時戰略", "俯視角"],
  卡牌對戰: ["卡牌構築", "回合制", "即時戰略"],
  塔防: ["塔防元素", "即時戰略", "俯視角"],
  益智: ["解謎機制", "慢節奏", "2D"],
  解謎: ["解謎機制", "劇情豐富", "2D"],
  模擬: ["建造", "慢節奏", "沙盒建造"],
  音樂節奏: ["快節奏", "觸控友善", "2D"],
  運動競技: ["競技", "快節奏", "多人對戰"],
  休閒: ["輕鬆治愈", "慢節奏", "可愛"],
  恐怖: ["恐怖氛圍", "黑暗", "第一人稱"],
  文字冒險: ["劇情豐富", "戀愛", "線性劇情"],
  沙盒: ["沙盒建造", "開放世界", "建造"],
};

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export type TagRecommendation = {
  tag: GameTag;
  score: number;
  reason: "keyword" | "genre" | "popular";
};

export function recommendTags(input: {
  title: string;
  description: string;
  genre: GameGenre | "";
  selectedTags: string[];
  limit?: number;
}): TagRecommendation[] {
  const limit = input.limit ?? 12;
  const corpus = normalizeText(`${input.title} ${input.description}`);
  const selected = new Set(input.selectedTags);
  const scores = new Map<GameTag, { score: number; reason: TagRecommendation["reason"] }>();

  for (const { tag, keywords } of TAG_KEYWORD_MAP) {
    if (selected.has(tag)) continue;
    for (const keyword of keywords) {
      if (corpus.includes(normalizeText(keyword))) {
        const prev = scores.get(tag);
        scores.set(tag, {
          score: (prev?.score ?? 0) + 3,
          reason: "keyword",
        });
        break;
      }
    }
  }

  if (input.genre && (GAME_GENRES as readonly string[]).includes(input.genre)) {
    const hints = GENRE_TAG_HINTS[input.genre as GameGenre] ?? [];
    for (const tag of hints) {
      if (selected.has(tag)) continue;
      const prev = scores.get(tag);
      scores.set(tag, {
        score: (prev?.score ?? 0) + 2,
        reason: prev?.reason ?? "genre",
      });
    }
  }

  return [...scores.entries()]
    .map(([tag, meta]) => ({ tag, score: meta.score, reason: meta.reason }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function evaluateTagCoverage(selectedTags: string[]) {
  const count = selectedTags.length;
  const coveragePercent = Math.min(
    100,
    Math.round((count / TAG_COVERAGE_FULL) * 100)
  );
  let level: "low" | "fair" | "good" | "excellent" = "low";
  if (count >= TAG_COVERAGE_FULL) level = "excellent";
  else if (count >= RECOMMENDED_MIN_TAGS) level = "good";
  else if (count >= 2) level = "fair";

  return {
    count,
    recommendedMin: RECOMMENDED_MIN_TAGS,
    coveragePercent,
    level,
    needsMore: count < RECOMMENDED_MIN_TAGS,
  };
}

export function filterValidSuggestedTags(tags: string[]): GameTag[] {
  const tagSet = new Set<string>(GAME_TAGS);
  return tags.filter((tag): tag is GameTag => tagSet.has(tag));
}
