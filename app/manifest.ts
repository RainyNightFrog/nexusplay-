import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NexusPlay",
    short_name: "NexusPlay",
    description: "Web game platform for play and upload",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#0891b2",
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
    ],
    scope: "/",
  };
}
