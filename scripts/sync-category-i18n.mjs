import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

const CATEGORY_LABELS = {
  en: {
    全部: "All",
    動作: "Action",
    策略: "Strategy",
    益智: "Puzzle",
    RPG: "RPG",
    模擬: "Simulation",
    冒險: "Adventure",
    休閒: "Casual",
    恐怖: "Horror",
    卡牌對戰: "Card Game",
    塔防: "Tower Defense",
    "3D": "3D",
    "2D": "2D",
    賽博朋克: "Cyberpunk",
    硬核: "Hardcore",
    Roguelike: "Roguelike",
    自動化: "Automation",
    復古: "Retro",
    像素風: "Pixel Art",
    多人對戰: "Multiplayer",
    單機: "Singleplayer",
    科幻: "Sci-Fi",
    WebGL: "WebGL",
  },
  "zh-CN": {
    全部: "全部",
    動作: "动作",
    策略: "策略",
    益智: "益智",
    RPG: "RPG",
    模擬: "模拟",
    冒險: "冒险",
    休閒: "休闲",
    恐怖: "恐怖",
    卡牌對戰: "卡牌对战",
    塔防: "塔防",
    "3D": "3D",
    "2D": "2D",
    賽博朋克: "赛博朋克",
    硬核: "硬核",
    Roguelike: "Roguelike",
    自動化: "自动化",
    復古: "复古",
    像素風: "像素风",
    多人對戰: "多人对战",
    單機: "单机",
    科幻: "科幻",
    WebGL: "WebGL",
  },
  "zh-HK": {
    全部: "全部",
    動作: "動作",
    策略: "策略",
    益智: "益智",
    RPG: "RPG",
    模擬: "模擬",
    冒險: "冒險",
    休閒: "休閒",
    恐怖: "恐怖",
    卡牌對戰: "卡牌對戰",
    塔防: "塔防",
    "3D": "3D",
    "2D": "2D",
    賽博朋克: "賽博朋克",
    硬核: "硬核",
    Roguelike: "Roguelike",
    自動化: "自動化",
    復古: "復古",
    像素風: "像素風",
    多人對戰: "多人對戰",
    單機: "單機",
    科幻: "科幻",
    WebGL: "WebGL",
  },
};

const FALLBACK = CATEGORY_LABELS.en;

for (const locale of [
  "en",
  "zh-CN",
  "zh-HK",
  "es",
  "fr",
  "de",
  "pt",
  "th",
  "vi",
  "ko",
  "ja",
]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  const labels = { ...FALLBACK, ...(CATEGORY_LABELS[locale] ?? {}) };

  data.home.categories = labels;
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
