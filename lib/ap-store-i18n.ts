/**
 * AP 商店商品多語系：資料庫存繁中 canonical，依 locale／key 轉成顯示文字。
 * 未列出的 key 維持原文。
 */

export type ApStoreCatalogEntry = {
  name: string;
  description: string;
};

const AP_STORE_CATALOG_EN: Record<string, ApStoreCatalogEntry> = {
  title_neon_nova: {
    name: "Neon Nova",
    description: "Common title: soft blue neon text",
  },
  title_cyber_ronin: {
    name: "Cyber Ronin",
    description: "Rare title: purple–cyan gradient",
  },
  title_void_lord: {
    name: "Void Lord",
    description: "Epic title: deep-space purple–gold glow",
  },
  title_rain_emperor: {
    name: "Rain Emperor",
    description: "Legendary limited title: the brightest site-wide",
  },
  title_pixel_wanderer: {
    name: "Pixel Wanderer",
    description: "Common title: retro pixel cyan text",
  },
  title_neon_oracle: {
    name: "Neon Oracle",
    description: "Rare title: pink–cyan neon oracle text",
  },
  title_abyss_herald: {
    name: "Abyss Herald",
    description: "Epic title: abyss purple–red herald glow",
  },
  title_frog_of_eternity: {
    name: "Eternal Frog",
    description: "Mythic limited title: eternal frog aura of the rainy night",
  },
  name_cyan_pulse: {
    name: "Cyan Pulse",
    description: "Common name color: cyan pulse",
  },
  name_rose_flare: {
    name: "Rose Flare",
    description: "Rare name color: rose flare",
  },
  name_aurora_flow: {
    name: "Aurora Flow",
    description: "Epic name color: flowing aurora gradient",
  },
  name_gold_legend: {
    name: "Gold Legend",
    description: "Legendary name color: gold-foil sheen",
  },
  name_lime_static: {
    name: "Lime Static",
    description: "Common name color: lime static glow",
  },
  name_ice_shard: {
    name: "Ice Shard",
    description: "Rare name color: ice-shard frost light",
  },
  name_crimson_nova: {
    name: "Crimson Nova",
    description: "Epic name color: crimson nova gradient",
  },
  name_prism_myth: {
    name: "Prism Myth",
    description: "Mythic name color: full-spectrum prism flow",
  },
  frame_cyan_ring: {
    name: "Cyan Ring Frame",
    description: "Common frame: thin cyan ring",
  },
  frame_violet_glow: {
    name: "Violet Glow Frame",
    description: "Rare frame: violet outer glow",
  },
  frame_gold_crown: {
    name: "Gold Crown Frame",
    description: "Epic frame: golden crown",
  },
  frame_void_orbit: {
    name: "Void Orbit Frame",
    description: "Legendary frame: orbiting arc ring with spark trails",
  },
  frame_mint_hex: {
    name: "Mint Hex Frame",
    description: "Common frame: mint hex ring",
  },
  frame_ember_ring: {
    name: "Ember Ring Frame",
    description: "Rare frame: warm ember ring",
  },
  frame_crystal_prism: {
    name: "Crystal Prism Frame",
    description: "Epic frame: crystal prism refraction",
  },
  frame_eternal_rain: {
    name: "Eternal Rain Halo",
    description: "Mythic frame: lightning bolts and electric halo around your avatar",
  },
  badge_mint_spark: {
    name: "Mint Spark",
    description: "Common bubble effect: mint shimmer",
  },
  badge_sunset_wave: {
    name: "Sunset Wave",
    description: "Rare bubble effect: warm orange ripples",
  },
  badge_void_pulse: {
    name: "Void Pulse",
    description: "Epic bubble effect: deep purple pulse",
  },
  badge_rain_storm: {
    name: "Rain Storm",
    description: "Legendary bubble effect: esports storm aura",
  },
  badge_sky_ripple: {
    name: "Sky Ripple",
    description: "Common bubble effect: sky-blue ripples",
  },
  badge_plasma_arc: {
    name: "Plasma Arc",
    description: "Rare bubble effect: plasma arc light",
  },
  badge_obsidian_flare: {
    name: "Obsidian Flare",
    description: "Epic bubble effect: obsidian flame pattern",
  },
  badge_frog_aurora: {
    name: "Frog Aurora",
    description: "Mythic bubble effect: frog-night aurora storm",
  },
};

const AP_STORE_CATALOG_ZH_CN: Record<string, ApStoreCatalogEntry> = {
  title_neon_nova: {
    name: "霓虹新星",
    description: "普通称号：淡蓝霓虹字样",
  },
  title_cyber_ronin: {
    name: "赛博浪客",
    description: "稀有称号：紫青双色渐层",
  },
  title_void_lord: {
    name: "虚空领主",
    description: "史诗称号：深空紫金光晕",
  },
  title_rain_emperor: {
    name: "雨夜帝王",
    description: "传说限定称号：全站最耀眼",
  },
  title_pixel_wanderer: {
    name: "像素旅人",
    description: "普通称号：复古像素青字",
  },
  title_neon_oracle: {
    name: "霓虹先知",
    description: "稀有称号：粉青霓虹预言字样",
  },
  title_abyss_herald: {
    name: "深渊传令",
    description: "史诗称号：深渊紫红传令光晕",
  },
  title_frog_of_eternity: {
    name: "永夜蛙神",
    description: "神话限定称号：雨夜蛙神永恒光环",
  },
  name_cyan_pulse: {
    name: "青脉之名",
    description: "普通名字色：青色脉动",
  },
  name_rose_flare: {
    name: "玫焰之名",
    description: "稀有名字色：玫红闪焰",
  },
  name_aurora_flow: {
    name: "极光流光",
    description: "史诗名字色：极光流动渐层",
  },
  name_gold_legend: {
    name: "金传说名",
    description: "传说名字色：金箔光泽",
  },
  name_lime_static: {
    name: "莱姆静电",
    description: "普通名字色：莱姆静电微光",
  },
  name_ice_shard: {
    name: "冰晶裂痕",
    description: "稀有名字色：冰晶裂痕冷光",
  },
  name_crimson_nova: {
    name: "赤焰新星",
    description: "史诗名字色：赤焰新星渐层",
  },
  name_prism_myth: {
    name: "棱镜神话",
    description: "神话名字色：全光谱棱镜流动",
  },
  frame_cyan_ring: {
    name: "青环头像框",
    description: "普通头像框：青色细环",
  },
  frame_violet_glow: {
    name: "紫辉头像框",
    description: "稀有头像框：紫色外辉",
  },
  frame_gold_crown: {
    name: "金冠头像框",
    description: "史诗头像框：金色冠冕",
  },
  frame_void_orbit: {
    name: "虚空轨道框",
    description: "传说头像框：电弧轨道环与火花轨迹",
  },
  frame_mint_hex: {
    name: "薄荷六角框",
    description: "普通头像框：薄荷六角细环",
  },
  frame_ember_ring: {
    name: "余烬环框",
    description: "稀有头像框：余烬暖橙光环",
  },
  frame_crystal_prism: {
    name: "水晶棱镜框",
    description: "史诗头像框：水晶棱镜折射",
  },
  frame_eternal_rain: {
    name: "永雨神环",
    description: "神话头像框：头像外围闪电与电弧神环",
  },
  badge_mint_spark: {
    name: "薄荷火花",
    description: "普通徽章特效：薄荷微光",
  },
  badge_sunset_wave: {
    name: "夕阳波纹",
    description: "稀有徽章特效：暖橙波纹",
  },
  badge_void_pulse: {
    name: "虚空脉冲",
    description: "史诗徽章特效：深紫脉冲",
  },
  badge_rain_storm: {
    name: "雨夜风暴",
    description: "传说徽章特效：电竞风暴光环",
  },
  badge_sky_ripple: {
    name: "青空涟漪",
    description: "普通徽章特效：青空涟漪",
  },
  badge_plasma_arc: {
    name: "电浆弧光",
    description: "稀有徽章特效：电浆弧光",
  },
  badge_obsidian_flare: {
    name: "黑曜焰纹",
    description: "史诗徽章特效：黑曜焰纹",
  },
  badge_frog_aurora: {
    name: "蛙夜极光",
    description: "神话徽章特效：蛙夜极光风暴",
  },
};

function isZhHk(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-hk" || n === "zh-tw";
}

function isZhCn(locale: string) {
  const n = locale.toLowerCase();
  return n === "zh-cn" || n === "zh";
}

export function localizeApStoreItem(
  key: string | null | undefined,
  locale: string,
  fallback?: { name?: string | null; description?: string | null }
): ApStoreCatalogEntry {
  const nameFallback = fallback?.name?.trim() || key || "";
  const descFallback = fallback?.description?.trim() || "";

  if (!key) {
    return { name: nameFallback, description: descFallback };
  }

  if (isZhHk(locale)) {
    return { name: nameFallback, description: descFallback };
  }

  if (isZhCn(locale)) {
    const zh = AP_STORE_CATALOG_ZH_CN[key];
    return {
      name: zh?.name ?? nameFallback,
      description: zh?.description ?? descFallback,
    };
  }

  const en = AP_STORE_CATALOG_EN[key];
  return {
    name: en?.name ?? nameFallback,
    description: en?.description ?? descFallback,
  };
}
