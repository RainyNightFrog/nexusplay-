import type { SupabaseClient } from "@supabase/supabase-js";
import { isWinLeaderboardSubmission } from "@/lib/achievement-unlock-service";

export type UserAchievementMetrics = {
  total_play_time: number;
  total_online_time: number;
  total_donated: number;
  night_online_time: number;
  win_count: number;
  s_rank_count: number;
  games_played: number;
  leaderboard_submits: number;
  game_comments: number;
  forum_posts: number;
  forum_comments: number;
  chat_messages: number;
  favorites: number;
  follows: number;
  followers: number;
  cloud_saves: number;
  tip_creators: number;
  purchases: number;
  creator_games_live: number;
  creator_tips_received: number;
  creator_comments_received: number;
  creator_plays_total: number;
  account_age_days: number;
  profile_complete: number;
};

const EMPTY_METRICS: UserAchievementMetrics = {
  total_play_time: 0,
  total_online_time: 0,
  total_donated: 0,
  night_online_time: 0,
  win_count: 0,
  s_rank_count: 0,
  games_played: 0,
  leaderboard_submits: 0,
  game_comments: 0,
  forum_posts: 0,
  forum_comments: 0,
  chat_messages: 0,
  favorites: 0,
  follows: 0,
  followers: 0,
  cloud_saves: 0,
  tip_creators: 0,
  purchases: 0,
  creator_games_live: 0,
  creator_tips_received: 0,
  creator_comments_received: 0,
  creator_plays_total: 0,
  account_age_days: 0,
  profile_complete: 0,
};

function isSRankGrade(grade: string | null | undefined): boolean {
  if (!grade?.trim()) return false;
  return /^(S{1,3}|SSS\+?)$/i.test(grade.trim());
}

const PROGRESS_BY_CODE: Record<string, (m: UserAchievementMetrics) => number> = {
  first_win: (m) => Math.min(m.win_count, 1),
  big_tipper: (m) => Math.min(Math.floor(m.total_donated), 100),
  big_tipper_500: (m) => Math.min(Math.floor(m.total_donated), 500),
  creator_debut: (m) => Math.min(m.creator_games_live, 1),
  night_owl: (m) => Math.min(m.night_online_time, 36000),
  night_owl_50h: (m) => Math.min(m.night_online_time, 180000),
  playtime_1h: (m) => Math.min(m.total_play_time, 3600),
  playtime_10h: (m) => Math.min(m.total_play_time, 36000),
  playtime_50h: (m) => Math.min(m.total_play_time, 180000),
  playtime_100h: (m) => Math.min(m.total_play_time, 360000),
  games_played_5: (m) => Math.min(m.games_played, 5),
  games_played_15: (m) => Math.min(m.games_played, 15),
  games_played_30: (m) => Math.min(m.games_played, 30),
  leaderboard_submit: (m) => Math.min(m.leaderboard_submits, 1),
  leaderboard_10: (m) => Math.min(m.leaderboard_submits, 10),
  leaderboard_50: (m) => Math.min(m.leaderboard_submits, 50),
  win_collector: (m) => Math.min(m.win_count, 5),
  win_master: (m) => Math.min(m.win_count, 25),
  win_legend: (m) => Math.min(m.win_count, 100),
  s_rank_clear: (m) => Math.min(m.s_rank_count, 1),
  cloud_save_1: (m) => Math.min(m.cloud_saves, 1),
  cloud_save_5: (m) => Math.min(m.cloud_saves, 5),
  first_comment: (m) => Math.min(m.game_comments, 1),
  comments_25: (m) => Math.min(m.game_comments, 25),
  forum_debut: (m) => Math.min(m.forum_posts, 1),
  forum_regular: (m) => Math.min(m.forum_posts, 10),
  forum_replies_50: (m) => Math.min(m.forum_comments, 50),
  chat_regular: (m) => Math.min(m.chat_messages, 50),
  chat_veteran: (m) => Math.min(m.chat_messages, 200),
  chat_legend: (m) => Math.min(m.chat_messages, 1000),
  favorites_5: (m) => Math.min(m.favorites, 5),
  favorites_20: (m) => Math.min(m.favorites, 20),
  follows_5: (m) => Math.min(m.follows, 5),
  follows_20: (m) => Math.min(m.follows, 20),
  social_butterfly: (m) =>
    Math.min(m.game_comments + m.forum_posts + m.forum_comments + m.chat_messages, 50),
  social_legend: (m) =>
    Math.min(m.game_comments + m.forum_posts + m.forum_comments + m.chat_messages, 300),
  tip_creators_5: (m) => Math.min(m.tip_creators, 5),
  tip_creators_15: (m) => Math.min(m.tip_creators, 15),
  first_purchase: (m) => Math.min(m.purchases, 1),
  patron_3: (m) => Math.min(m.purchases, 3),
  patron_10: (m) => Math.min(m.purchases, 10),
  creator_3_games: (m) => Math.min(m.creator_games_live, 3),
  creator_5_games: (m) => Math.min(m.creator_games_live, 5),
  creator_first_tip: (m) => Math.min(m.creator_tips_received, 1),
  creator_tips_10: (m) => Math.min(m.creator_tips_received, 10),
  creator_tips_50: (m) => Math.min(m.creator_tips_received, 50),
  creator_community: (m) => Math.min(m.creator_comments_received, 10),
  creator_comments_50: (m) => Math.min(m.creator_comments_received, 50),
  creator_plays_1k: (m) => Math.min(m.creator_plays_total, 1000),
  creator_plays_10k: (m) => Math.min(m.creator_plays_total, 10000),
  followed_10: (m) => Math.min(m.followers, 10),
  followed_50: (m) => Math.min(m.followers, 50),
  online_10h: (m) => Math.min(m.total_online_time, 36000),
  online_50h: (m) => Math.min(m.total_online_time, 180000),
  online_100h: (m) => Math.min(m.total_online_time, 360000),
  veteran_30d: (m) => Math.min(m.account_age_days, 30),
  veteran_90d: (m) => Math.min(m.account_age_days, 90),
  veteran_365d: (m) => Math.min(m.account_age_days, 365),
  profile_complete: (m) => m.profile_complete,
  donation_starter: (m) => (m.total_donated > 0 ? 1 : 0),
};

export function resolveAchievementProgress(
  code: string,
  metrics: UserAchievementMetrics,
  progressTarget: number,
  unlocked: boolean
): { progress_current: number; progress_target: number; progress_percent: number } {
  const target = Math.max(1, progressTarget);
  if (unlocked) {
    return { progress_current: target, progress_target: target, progress_percent: 100 };
  }

  const resolver = PROGRESS_BY_CODE[code];
  const current = resolver ? Math.max(0, resolver(metrics)) : 0;
  const percent = Math.min(100, Math.round((current / target) * 100));

  return {
    progress_current: Math.min(current, target),
    progress_target: target,
    progress_percent: percent,
  };
}

function daysSince(iso: string) {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 0;
  return Math.floor((Date.now() - ts) / 86_400_000);
}

export async function loadUserAchievementMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<UserAchievementMetrics> {
  const metrics = { ...EMPTY_METRICS };

  const [
    activityRes,
    profileRes,
    leaderboardRes,
    commentsRes,
    forumPostsRes,
    forumCommentsRes,
    chatRes,
    favoritesRes,
    followsRes,
    followersRes,
    savesRes,
    tipsPaidRes,
    purchasesRes,
    creatorGamesRes,
    creatorTipsRes,
  ] = await Promise.all([
    supabase
      .from("user_activity_stats")
      .select("total_play_time, total_online_time, total_donated, night_online_time")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at, support_email, bio")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("game_leaderboard")
      .select("game_id, grade, meta")
      .eq("user_id", userId),
    supabase
      .from("game_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("forum_comments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_game_favorites")
      .select("game_id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("creator_follows")
      .select("creator_id", { count: "exact", head: true })
      .eq("follower_id", userId),
    supabase
      .from("creator_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("creator_id", userId),
    supabase
      .from("game_saves")
      .select("game_id")
      .eq("user_id", userId),
    supabase
      .from("game_tips")
      .select("creator_id")
      .eq("payer_id", userId)
      .eq("status", "succeeded"),
    supabase
      .from("game_entitlements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("games")
      .select("id, plays_count")
      .eq("creator_id", userId)
      .eq("publish_status", "public")
      .eq("status", "approved"),
    supabase
      .from("game_tips")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "succeeded"),
  ]);

  const activity = activityRes.data;
  if (activity) {
    metrics.total_play_time = activity.total_play_time ?? 0;
    metrics.total_online_time = activity.total_online_time ?? 0;
    metrics.total_donated = Number(activity.total_donated ?? 0);
    metrics.night_online_time = activity.night_online_time ?? 0;
  }

  const profile = profileRes.data;
  if (profile) {
    metrics.account_age_days = daysSince(profile.created_at ?? "");
    const hasName = Boolean(profile.display_name?.trim());
    const hasExtra = Boolean(
      profile.avatar_url?.trim() ||
        profile.support_email?.trim() ||
        profile.bio?.trim()
    );
    metrics.profile_complete = hasName && hasExtra ? 1 : 0;
  }

  const leaderboardRows = leaderboardRes.data ?? [];
  metrics.leaderboard_submits = leaderboardRows.length;
  metrics.games_played = new Set(leaderboardRows.map((row) => row.game_id)).size;

  let winCount = 0;
  let sRankCount = 0;
  for (const row of leaderboardRows) {
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {};
    if (isWinLeaderboardSubmission(row.grade, meta)) {
      winCount += 1;
    }
    if (isSRankGrade(row.grade)) {
      sRankCount += 1;
    }
  }
  metrics.win_count = winCount;
  metrics.s_rank_count = sRankCount;

  metrics.game_comments = commentsRes.count ?? 0;
  metrics.forum_posts = forumPostsRes.count ?? 0;
  metrics.forum_comments = forumCommentsRes.count ?? 0;
  metrics.chat_messages = chatRes.count ?? 0;
  metrics.favorites = favoritesRes.count ?? 0;
  metrics.follows = followsRes.count ?? 0;
  metrics.followers = followersRes.count ?? 0;
  metrics.cloud_saves = new Set((savesRes.data ?? []).map((row) => row.game_id)).size;
  metrics.tip_creators = new Set(
    (tipsPaidRes.data ?? []).map((row) => row.creator_id).filter(Boolean)
  ).size;
  metrics.purchases = purchasesRes.count ?? 0;

  const creatorGames = creatorGamesRes.data ?? [];
  metrics.creator_games_live = creatorGames.length;
  metrics.creator_plays_total = creatorGames.reduce(
    (sum, game) => sum + (Number(game.plays_count) || 0),
    0
  );
  metrics.creator_tips_received = creatorTipsRes.count ?? 0;

  if (creatorGames.length > 0) {
    const gameIds = creatorGames.map((g) => g.id);
    const { count } = await supabase
      .from("game_comments")
      .select("id", { count: "exact", head: true })
      .in("game_id", gameIds);
    metrics.creator_comments_received = count ?? 0;
  }

  return metrics;
}

export function formatProgressLabel(
  code: string,
  current: number,
  target: number
): string {
  if (code === "big_tipper" || code === "big_tipper_500") {
    return `HK$${current}/${target}`;
  }
  if (
    code.includes("playtime") ||
    code.startsWith("online_") ||
    code.startsWith("night_owl")
  ) {
    const ch = Math.floor(current / 3600);
    const th = Math.max(1, Math.floor(target / 3600));
    return `${ch}/${th}h`;
  }
  if (code.startsWith("veteran_")) return `${current}/${target}天`;
  return `${current}/${target}`;
}
