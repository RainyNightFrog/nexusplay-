import type { SupabaseClient } from "@supabase/supabase-js";

export type UserAchievementMetrics = {
  total_play_time: number;
  total_online_time: number;
  total_donated: number;
  night_online_time: number;
  win_count: number;
  games_played: number;
  leaderboard_submits: number;
  game_comments: number;
  forum_posts: number;
  forum_comments: number;
  chat_messages: number;
  favorites: number;
  creator_games_live: number;
  creator_tips_received: number;
  creator_comments_received: number;
  account_age_days: number;
  profile_complete: number;
};

const EMPTY_METRICS: UserAchievementMetrics = {
  total_play_time: 0,
  total_online_time: 0,
  total_donated: 0,
  night_online_time: 0,
  win_count: 0,
  games_played: 0,
  leaderboard_submits: 0,
  game_comments: 0,
  forum_posts: 0,
  forum_comments: 0,
  chat_messages: 0,
  favorites: 0,
  creator_games_live: 0,
  creator_tips_received: 0,
  creator_comments_received: 0,
  account_age_days: 0,
  profile_complete: 0,
};

const PROGRESS_BY_CODE: Record<string, (m: UserAchievementMetrics) => number> = {
  first_win: (m) => Math.min(m.win_count, 1),
  big_tipper: (m) => Math.min(Math.floor(m.total_donated), 100),
  creator_debut: (m) => Math.min(m.creator_games_live, 1),
  night_owl: (m) => Math.min(m.night_online_time, 36000),
  playtime_1h: (m) => Math.min(m.total_play_time, 3600),
  playtime_10h: (m) => Math.min(m.total_play_time, 36000),
  playtime_50h: (m) => Math.min(m.total_play_time, 180000),
  games_played_5: (m) => Math.min(m.games_played, 5),
  leaderboard_submit: (m) => Math.min(m.leaderboard_submits, 1),
  win_collector: (m) => Math.min(m.win_count, 5),
  first_comment: (m) => Math.min(m.game_comments, 1),
  forum_debut: (m) => Math.min(m.forum_posts, 1),
  chat_regular: (m) => Math.min(m.chat_messages, 20),
  favorites_5: (m) => Math.min(m.favorites, 5),
  social_butterfly: (m) =>
    Math.min(m.game_comments + m.forum_posts + m.forum_comments + m.chat_messages, 30),
  creator_3_games: (m) => Math.min(m.creator_games_live, 3),
  creator_first_tip: (m) => Math.min(m.creator_tips_received, 1),
  creator_community: (m) => Math.min(m.creator_comments_received, 10),
  online_10h: (m) => Math.min(m.total_online_time, 36000),
  veteran_30d: (m) => Math.min(m.account_age_days, 30),
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
    creatorGamesRes,
    creatorTipsRes,
    firstWinRes,
  ] = await Promise.all([
    supabase
      .from("user_activity_stats")
      .select("total_play_time, total_online_time, total_donated, night_online_time")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url, created_at, support_email")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("game_leaderboard")
      .select("game_id")
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
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("publish_status", "public")
      .eq("status", "approved"),
    supabase
      .from("game_tips")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "succeeded"),
    supabase
      .from("achievements")
      .select("id")
      .eq("code", "first_win")
      .maybeSingle(),
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
    const hasExtra = Boolean(profile.avatar_url?.trim() || profile.support_email?.trim());
    metrics.profile_complete = hasName && hasExtra ? 1 : 0;
  }

  const leaderboardRows = leaderboardRes.data ?? [];
  metrics.leaderboard_submits = leaderboardRows.length;
  metrics.games_played = new Set(leaderboardRows.map((row) => row.game_id)).size;
  metrics.game_comments = commentsRes.count ?? 0;
  metrics.forum_posts = forumPostsRes.count ?? 0;
  metrics.forum_comments = forumCommentsRes.count ?? 0;
  metrics.chat_messages = chatRes.count ?? 0;
  metrics.favorites = favoritesRes.count ?? 0;
  metrics.creator_games_live = creatorGamesRes.count ?? 0;
  metrics.creator_tips_received = creatorTipsRes.count ?? 0;

  if (firstWinRes.data?.id) {
    const { data: firstWinUnlock } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId)
      .eq("achievement_id", firstWinRes.data.id)
      .maybeSingle();
    if (firstWinUnlock) metrics.win_count = 1;
  }

  const { data: winCollector } = await supabase
    .from("achievements")
    .select("id")
    .eq("code", "win_collector")
    .maybeSingle();

  if (winCollector?.id) {
    const { data: winUnlock } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId)
      .eq("achievement_id", winCollector.id)
      .maybeSingle();
    if (winUnlock) metrics.win_count = 5;
    else if (metrics.win_count > 0) {
      metrics.win_count = Math.min(metrics.leaderboard_submits, 5);
    }
  }

  if (metrics.creator_games_live > 0) {
    const { data: creatorGames } = await supabase
      .from("games")
      .select("id")
      .eq("creator_id", userId);

    const gameIds = (creatorGames ?? []).map((g) => g.id);
    if (gameIds.length > 0) {
      const { count } = await supabase
        .from("game_comments")
        .select("id", { count: "exact", head: true })
        .in("game_id", gameIds);
      metrics.creator_comments_received = count ?? 0;
    }
  }

  return metrics;
}

export function formatProgressLabel(
  code: string,
  current: number,
  target: number
): string {
  if (code === "big_tipper") return `HK$${current}/${target}`;
  if (
    code.includes("playtime") ||
    code === "online_10h" ||
    code === "night_owl"
  ) {
    const ch = Math.floor(current / 3600);
    const th = Math.max(1, Math.floor(target / 3600));
    return `${ch}/${th}h`;
  }
  if (code === "veteran_30d") return `${current}/${target}天`;
  return `${current}/${target}`;
}
