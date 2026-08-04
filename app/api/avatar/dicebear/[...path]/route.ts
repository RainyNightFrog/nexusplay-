import { NextResponse } from "next/server";

/** 僅允許 DiceBear 9.x 標準路徑，避免變成開放代理 */
const PATH_RE = /^9\.x\/[a-z0-9-]+\/(png|svg|jpg|webp)$/i;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

/**
 * 同源代理 DiceBear，避免手機網路阻擋 api.dicebear.com 造成聊天破圖。
 * 例：/api/avatar/dicebear/9.x/bottts/png?seed=cn-18&size=128
 */
export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const joined = (path ?? []).join("/");

  if (!PATH_RE.test(joined)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const incoming = new URL(request.url);
  const seed = incoming.searchParams.get("seed")?.trim() ?? "";
  if (!seed || seed.length > 128) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const sizeRaw = incoming.searchParams.get("size");
  const sizeNum = sizeRaw ? Number.parseInt(sizeRaw, 10) : 128;
  const size = Number.isFinite(sizeNum)
    ? String(Math.min(Math.max(sizeNum, 32), 512))
    : "128";

  const upstream = new URL(`https://api.dicebear.com/${joined}`);
  upstream.searchParams.set("seed", seed);
  upstream.searchParams.set("size", size);

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Accept: "image/*" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return new NextResponse("Upstream error", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Proxy failed", { status: 502 });
  }
}
