import { NextResponse } from "next/server";
import { getPlatformModeStatus } from "@/lib/platform-mode";

export async function GET() {
  const status = getPlatformModeStatus();
  let sanitizeEngine = "unknown";

  try {
    const { sanitizeRichHtml } = await import("@/lib/sanitize-rich-html");
    const sample = sanitizeRichHtml("<p>ok</p>", 32);
    sanitizeEngine = sample === "<p>ok</p>" ? "sanitize-html" : "sanitize-html-degraded";
  } catch (error) {
    sanitizeEngine =
      error instanceof Error ? error.message.slice(0, 120) : "sanitize-check-failed";
  }

  return NextResponse.json(
    { ...status, sanitizeEngine },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
