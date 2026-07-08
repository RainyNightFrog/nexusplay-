import { NextResponse } from "next/server";
import { getAllForumPosts } from "@/lib/forum-service";
import { resolveRequestLocale } from "@/lib/request-locale";

export async function GET(request: Request) {
  try {
    const locale = await resolveRequestLocale(request);
    const posts = await getAllForumPosts(locale);
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取討論區失敗";
    return NextResponse.json({ error: message, posts: [] }, { status: 500 });
  }
}
