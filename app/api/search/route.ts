import { NextResponse } from "next/server";
import { searchPlatform } from "@/lib/platform-search-service";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const result = await searchPlatform(query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "搜尋失敗";
    return NextResponse.json({ error: message, query: "", games: [], creators: [] }, { status: 500 });
  }
}
