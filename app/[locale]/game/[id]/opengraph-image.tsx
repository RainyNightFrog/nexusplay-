import { ImageResponse } from "next/og";
import { getPublicGameById } from "@/lib/games-service";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Image({ params }: Props) {
  const { id } = await params;
  const gameId = Number.parseInt(id, 10);
  const game = Number.isFinite(gameId) ? await getPublicGameById(gameId) : null;

  const title = game?.title ?? "RainyNightFrog";
  const subtitle = game?.creator ? `by ${game.creator}` : "Web Game";
  const coverUrl =
    game?.image?.startsWith("http://") || game?.image?.startsWith("https://")
      ? game.image
      : game?.image
        ? `${getSiteUrl()}${game.image.startsWith("/") ? game.image : `/${game.image}`}`
        : null;

  try {
    return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#09090b",
          color: "#fafafa",
        }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.35,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.55) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: "100%",
            padding: "72px",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#22d3ee",
              marginBottom: 16,
            }}
          >
            RainyNightFrog
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, color: "#d4d4d8", marginTop: 16 }}>{subtitle}</div>
        </div>
      </div>
    ),
    { ...size }
  );
  } catch {
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
            color: "#fafafa",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          {title}
        </div>
      ),
      { ...size }
    );
  }
}
