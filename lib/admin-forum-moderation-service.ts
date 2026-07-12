import { createServerSupabase } from "@/lib/supabase-server";

export type AdminForumPostRecord = {
  id: number;
  gameId: number;
  gameTitle: string;
  userId: string;
  authorName: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
  isHidden: boolean;
  isLocked: boolean;
  commentCount: number;
};

export type AdminForumCommentRecord = {
  id: number;
  postId: number;
  postTitle: string;
  gameTitle: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isHidden: boolean;
};

export async function listAdminForumPosts(params: {
  query?: string;
  limit?: number;
}): Promise<AdminForumPostRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  const { data: posts, error } = await supabase
    .from("forum_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const records = posts ?? [];
  const gameIds = [...new Set(records.map((row) => row.game_id as number))];
  const userIds = [...new Set(records.map((row) => row.user_id as string))];

  const [{ data: games }, { data: profiles }, commentCounts] = await Promise.all([
    gameIds.length
      ? supabase.from("games").select("id, title").in("id", gameIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    Promise.all(
      records.map(async (post) => {
        const { count } = await supabase
          .from("forum_comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", post.id);
        return [post.id as number, count ?? 0] as const;
      })
    ),
  ]);

  const gameMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      (profile.display_name as string) ?? "",
    ])
  );
  const commentMap = new Map(commentCounts);
  const query = params.query?.trim().toLowerCase() ?? "";

  return records
    .map((post) => ({
      id: post.id as number,
      gameId: post.game_id as number,
      gameTitle: gameMap.get(post.game_id as number) ?? "",
      userId: post.user_id as string,
      authorName:
        profileMap.get(post.user_id as string) ??
        (post.user_id as string).slice(0, 8),
      title: post.title as string,
      category: post.category as string,
      content: post.content as string,
      createdAt: post.created_at as string,
      isHidden: post.is_hidden === true,
      isLocked: post.is_locked === true,
      commentCount: commentMap.get(post.id as number) ?? 0,
    }))
    .filter((post) => {
      if (!query) return true;
      return (
        post.title.toLowerCase().includes(query) ||
        post.content.toLowerCase().includes(query) ||
        post.authorName.toLowerCase().includes(query) ||
        post.gameTitle.toLowerCase().includes(query)
      );
    });
}

export async function listAdminForumComments(params: {
  postId?: number;
  limit?: number;
}): Promise<AdminForumCommentRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  let query = supabase
    .from("forum_comments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.postId) {
    query = query.eq("post_id", params.postId);
  }

  const { data: comments, error } = await query;
  if (error) throw new Error(error.message);

  const records = comments ?? [];
  const postIds = [...new Set(records.map((row) => row.post_id as number))];
  const userIds = [...new Set(records.map((row) => row.user_id as string))];

  const { data: posts } = postIds.length
    ? await supabase
        .from("forum_posts")
        .select("id, title, game_id")
        .in("id", postIds)
    : { data: [] };

  const gameIds = [
    ...new Set((posts ?? []).map((post) => post.game_id as number)),
  ];

  const [{ data: games }, { data: profiles }] = await Promise.all([
    gameIds.length
      ? supabase.from("games").select("id, title").in("id", gameIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postMap = new Map(
    (posts ?? []).map((post) => [
      post.id as number,
      {
        title: post.title as string,
        gameId: post.game_id as number,
      },
    ])
  );
  const gameMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );
  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      (profile.display_name as string) ?? "",
    ])
  );

  return records.map((comment) => {
    const post = postMap.get(comment.post_id as number);
    const gameTitle = post ? (gameMap.get(post.gameId) ?? "") : "";
    return {
      id: comment.id as number,
      postId: comment.post_id as number,
      postTitle: post?.title ?? "",
      gameTitle,
      userId: comment.user_id as string,
      authorName:
        profileMap.get(comment.user_id as string) ??
        (comment.user_id as string).slice(0, 8),
      content: comment.content as string,
      createdAt: comment.created_at as string,
      isHidden: comment.is_hidden === true,
    };
  });
}

export async function moderateForumPost(params: {
  postId: number;
  action: "hide" | "unhide" | "lock" | "unlock" | "delete";
  adminId: string;
}) {
  const supabase = createServerSupabase();

  if (params.action === "delete") {
    const { error } = await supabase
      .from("forum_posts")
      .delete()
      .eq("id", params.postId);
    if (error) throw new Error(error.message);
    return { postId: params.postId, deleted: true };
  }

  const patch: Record<string, unknown> = {};
  if (params.action === "hide") {
    patch.is_hidden = true;
    patch.hidden_at = new Date().toISOString();
    patch.hidden_by = params.adminId;
  } else if (params.action === "unhide") {
    patch.is_hidden = false;
    patch.hidden_at = null;
    patch.hidden_by = null;
  } else if (params.action === "lock") {
    patch.is_locked = true;
  } else if (params.action === "unlock") {
    patch.is_locked = false;
  }

  const { error } = await supabase
    .from("forum_posts")
    .update(patch)
    .eq("id", params.postId);

  if (error) throw new Error(error.message);
  return { postId: params.postId, action: params.action };
}

export async function moderateForumComment(params: {
  commentId: number;
  action: "hide" | "unhide" | "delete";
  adminId: string;
}) {
  const supabase = createServerSupabase();

  if (params.action === "delete") {
    const { error } = await supabase
      .from("forum_comments")
      .delete()
      .eq("id", params.commentId);
    if (error) throw new Error(error.message);
    return { commentId: params.commentId, deleted: true };
  }

  const patch: Record<string, unknown> =
    params.action === "hide"
      ? {
          is_hidden: true,
          hidden_at: new Date().toISOString(),
          hidden_by: params.adminId,
        }
      : {
          is_hidden: false,
          hidden_at: null,
          hidden_by: null,
        };

  const { error } = await supabase
    .from("forum_comments")
    .update(patch)
    .eq("id", params.commentId);

  if (error) throw new Error(error.message);
  return { commentId: params.commentId, action: params.action };
}
