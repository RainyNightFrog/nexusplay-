import { NextResponse } from "next/server";
import { buildFeedCatalog } from "@/lib/feed-catalog-service";

export async function GET() {
  try {
    const catalog = buildFeedCatalog();
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build feed catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
