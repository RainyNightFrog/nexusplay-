import { NextResponse } from "next/server";
import { getAllForumPosts } from "@/lib/forum-service";

export async function GET() {
  try {
    const posts = await getAllForumPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取討論區失敗";
    return NextResponse.json({ error: message, posts: [] }, { status: 500 });
  }
}
