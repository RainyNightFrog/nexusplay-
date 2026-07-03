import {
  formatForumAuthor,
  type ForumCategory,
  type ForumComment,
  type ForumCommentRecord,
  type ForumPost,
  type ForumPostRecord,
  VALID_FORUM_CATEGORIES,
} from "@/lib/forum";
import { createServerSupabase } from "@/lib/supabase-server";

async function resolveAuthorNames(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const nameMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return nameMap;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueIds);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    nameMap.set(
      userId,
      formatForumAuthor(userId, profile?.display_name ?? null)
    );
  }

  return nameMap;
}

function mapPosts(
  records: ForumPostRecord[],
  nameMap: Map<string, string>
): ForumPost[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
  }));
}

function mapComments(
  records: ForumCommentRecord[],
  nameMap: Map<string, string>
): ForumComment[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
  }));
}

export async function getForumPostsByGameId(gameId: number): Promise<ForumPost[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`讀取討論貼文失敗：${error.message}`);
  }

  const records = (data ?? []) as ForumPostRecord[];
  const nameMap = await resolveAuthorNames(records.map((row) => row.user_id));
  return mapPosts(records, nameMap);
}

export async function getForumPostById(
  gameId: number,
  postId: number
): Promise<ForumPost | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("id", postId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取討論貼文失敗：${error.message}`);
  }

  if (!data) return null;

  const record = data as ForumPostRecord;
  const nameMap = await resolveAuthorNames([record.user_id]);
  return mapPosts([record], nameMap)[0] ?? null;
}

export async function getForumCommentsByPostId(
  postId: number
): Promise<ForumComment[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`讀取回覆失敗：${error.message}`);
  }

  const records = (data ?? []) as ForumCommentRecord[];
  const nameMap = await resolveAuthorNames(records.map((row) => row.user_id));
  return mapComments(records, nameMap);
}

export async function createForumPost(input: {
  gameId: number;
  userId: string;
  title: string;
  category: ForumCategory;
  content: string;
}): Promise<ForumPost> {
  if (!VALID_FORUM_CATEGORIES.includes(input.category)) {
    throw new Error("無效的貼文分類");
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      game_id: input.gameId,
      user_id: input.userId,
      title: input.title,
      category: input.category,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`發布討論失敗：${error.message}`);
  }

  const record = data as ForumPostRecord;
  const nameMap = await resolveAuthorNames([record.user_id]);
  return mapPosts([record], nameMap)[0]!;
}

export async function createForumComment(input: {
  postId: number;
  userId: string;
  content: string;
}): Promise<ForumComment> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`發表回覆失敗：${error.message}`);
  }

  const record = data as ForumCommentRecord;
  const nameMap = await resolveAuthorNames([record.user_id]);
  return mapComments([record], nameMap)[0]!;
}

export async function forumPostBelongsToGame(
  postId: number,
  gameId: number
): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("id", postId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`驗證貼文失敗：${error.message}`);
  }

  return Boolean(data);
}
