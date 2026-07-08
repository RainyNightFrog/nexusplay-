import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RainyNightFrog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 45%, #042f2e 100%)",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#22d3ee",
            marginBottom: 24,
          }}
        >
          RainyNightFrog
        </div>
        <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          Explore Web Games
        </div>
        <div style={{ fontSize: 32, color: "#a1a1aa", marginTop: 24, maxWidth: 820 }}>
          Play, upload, and support creators — 0% platform fees.
        </div>
      </div>
    ),
    { ...size }
  );
}
