import { ImageResponse } from "next/og";
import { loadPublicCreatorProfile } from "@/lib/creator-public-service";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Image({ params }: Props) {
  const { id } = await params;
  const creator = id.trim() ? await loadPublicCreatorProfile(id) : null;

  const name = creator?.displayName ?? "Creator";
  const gameCount = creator?.games.length ?? 0;
  const avatarUrl = creator?.avatarUrl;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #09090b 0%, #1e1b4b 55%, #042f2e 100%)",
          color: "#fafafa",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "72px",
            alignItems: "center",
            gap: 48,
          }}
        >
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 32,
              overflow: "hidden",
              border: "4px solid rgba(167,139,250,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#18181b",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ fontSize: 96, color: "#a78bfa" }}>★</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div
              style={{
                fontSize: 24,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#a78bfa",
                marginBottom: 16,
              }}
            >
              RainyNightFrog Creator
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, maxWidth: 760 }}>
              {name}
            </div>
            <div style={{ fontSize: 28, color: "#d4d4d8", marginTop: 16 }}>
              {gameCount} public {gameCount === 1 ? "game" : "games"}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
