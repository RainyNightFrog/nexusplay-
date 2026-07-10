import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RainyNightFrog",
    short_name: "RainyNightFrog",
    description: "Web game platform for play and upload",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#22d3ee",
    lang: "zh-HK",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/brand/rainynightfrog-icon-256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/brand/rainynightfrog-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    scope: "/",
  };
}
