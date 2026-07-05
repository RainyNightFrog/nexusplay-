import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/feed.xml", url.origin);
  target.searchParams.set("format", "atom");

  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "format") {
      target.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(target, 308);
}
