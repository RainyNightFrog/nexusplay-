import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RainyNightFrog · 霓虹網頁遊戲宇宙",
    short_name: "RainyNightFrog",
    description:
      "RainyNightFrog — 霓虹網頁遊戲宇宙。遊玩、投稿、社群與排行榜一站體驗。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a10",
    theme_color: "#0a0a10",
    lang: "zh-HK",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
