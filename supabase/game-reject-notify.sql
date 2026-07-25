-- ============================================================
-- RainyNightFrog：拒審通知 + 拒絕原因
-- 執行：npm run db:game-reject-notify
-- ============================================================

alter table public.games
  add column if not exists rejection_reason text;

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (
    kind in (
      'tip_received',
      'forum_reply',
      'followed_new_game',
      'wishlist_devlog',
      'game_rejected'
    )
  );
