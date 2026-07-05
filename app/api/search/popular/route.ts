import { NextResponse } from "next/server";
import { getPopularSearchTerms } from "@/lib/popular-search-service";

export async function GET() {
  try {
    const terms = await getPopularSearchTerms();
    return NextResponse.json({ terms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load popular search terms";
    return NextResponse.json({ error: message, terms: [] }, { status: 500 });
  }
}
