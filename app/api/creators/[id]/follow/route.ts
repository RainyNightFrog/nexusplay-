import { NextResponse } from "next/server";
import {
  followCreator,
  isFollowingCreator,
  readCreatorFollowerCount,
  unfollowCreator,
} from "@/lib/creator-follows-service";
import { loadPublicCreatorProfile } from "@/lib/creator-public-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creatorId = id?.trim();

    if (!creatorId) {
      return NextResponse.json({ error: "無效的創作者 ID" }, { status: 400 });
    }

    const followerCount = await readCreatorFollowerCount(creatorId);

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    let following = false;
    if (user && user.id !== creatorId) {
      following = await isFollowingCreator(authClient, user.id, creatorId);
    }

    return NextResponse.json({ following, followerCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取追蹤狀態失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creatorId = id?.trim();

    if (!creatorId) {
      return NextResponse.json({ error: "無效的創作者 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const creator = await loadPublicCreatorProfile(creatorId);
    if (!creator) {
      return NextResponse.json({ error: "找不到創作者或頁面未公開" }, { status: 404 });
    }

    await followCreator(authClient, user.id, creatorId);
    const followerCount = await readCreatorFollowerCount(creatorId);

    return NextResponse.json({ following: true, followerCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "追蹤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creatorId = id?.trim();

    if (!creatorId) {
      return NextResponse.json({ error: "無效的創作者 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    await unfollowCreator(authClient, user.id, creatorId);
    const followerCount = await readCreatorFollowerCount(creatorId);

    return NextResponse.json({ following: false, followerCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消追蹤失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
