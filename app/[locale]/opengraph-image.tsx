import { ImageResponse } from "next/og";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logoUrl = `${getSiteUrl()}/brand/rainynightfrog-logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="RainyNightFrog"
          style={{ maxWidth: "86%", maxHeight: "72%", objectFit: "contain" }}
        />
      </div>
    ),
    { ...size }
  );
}
