-- =============================================================================
-- Virtual Texas Hold'em — 積分制撲克（純虛擬積分，無真實貨幣）
-- 執行：npm run db:poker
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums（若已存在則跳過）
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE poker_points_ledger_reason AS ENUM (
    'DAILY_CHECKIN',
    'PLAYTIME_TICKER',
    'QUEST_REWARD',
    'HAND_BUY_IN',
    'HAND_CASH_OUT',
    'HAND_WIN',
    'HAND_LOSS',
    'BANKRUPTCY_REBUY',
    'ADMIN_ADJUST',
    'STREAK_BONUS'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_table_tier AS ENUM ('MICRO', 'LOW', 'MID', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_table_room_status AS ENUM ('WAITING', 'RUNNING', 'PAUSED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_quest_kind AS ENUM (
    'PLAY_HANDS',
    'WIN_HAND_PAIR_OR_BETTER',
    'FOLD_PREFLOP',
    'WIN_POTS',
    'STAY_ACTIVE_MINUTES',
    'ALL_IN_COUNT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_seat_occupant_type AS ENUM ('HUMAN', 'AI_BOT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_ai_bot_profile AS ENUM (
    'LOOSE_PASSIVE',
    'BALANCED',
    'TIGHT_AGGRESSIVE',
    'GTO_LITE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- poker_users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  points_balance INT NOT NULL DEFAULT 5000 CHECK (points_balance >= 0),
  bankruptcy_rebuys_today INT NOT NULL DEFAULT 0,
  bankruptcy_rebuy_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poker_users_balance ON poker_users (points_balance);

-- -----------------------------------------------------------------------------
-- poker_points_ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_points_ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poker_user_id TEXT NOT NULL REFERENCES poker_users(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  balance_after INT NOT NULL,
  reason poker_points_ledger_reason NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poker_ledger_user_created
  ON poker_points_ledger (poker_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poker_ledger_reason
  ON poker_points_ledger (reason, created_at DESC);

-- -----------------------------------------------------------------------------
-- poker_daily_checkins
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_daily_checkins (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poker_user_id TEXT NOT NULL REFERENCES poker_users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  streak_day INT NOT NULL CHECK (streak_day BETWEEN 1 AND 7),
  points_awarded INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poker_user_id, checkin_date)
);

-- -----------------------------------------------------------------------------
-- poker_quests / progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_quests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug TEXT NOT NULL UNIQUE,
  kind poker_quest_kind NOT NULL,
  target_value INT NOT NULL,
  reward_points INT NOT NULL,
  title_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  is_daily BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poker_quest_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poker_user_id TEXT NOT NULL REFERENCES poker_users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES poker_quests(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poker_user_id, quest_id, progress_date)
);

CREATE INDEX IF NOT EXISTS idx_poker_quest_progress_user_date
  ON poker_quest_progress (poker_user_id, progress_date);

-- -----------------------------------------------------------------------------
-- playtime ticker
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_playtime_ticker_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  poker_user_id TEXT NOT NULL REFERENCES poker_users(id) ON DELETE CASCADE,
  tick_date DATE NOT NULL,
  tick_index INT NOT NULL CHECK (tick_index BETWEEN 1 AND 6),
  points_awarded INT NOT NULL,
  hands_in_window INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poker_user_id, tick_date, tick_index)
);

-- -----------------------------------------------------------------------------
-- table rooms / seats
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_table_rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  tier poker_table_tier NOT NULL,
  status poker_table_room_status NOT NULL DEFAULT 'WAITING',
  small_blind INT NOT NULL,
  big_blind INT NOT NULL,
  min_buy_in INT NOT NULL,
  max_buy_in INT NOT NULL,
  max_seats INT NOT NULL DEFAULT 9,
  default_bot_profile poker_ai_bot_profile NOT NULL,
  hand_number INT NOT NULL DEFAULT 0,
  redis_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_poker_rooms_tier_status
  ON poker_table_rooms (tier, status);

CREATE TABLE IF NOT EXISTS poker_table_seats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT NOT NULL REFERENCES poker_table_rooms(id) ON DELETE CASCADE,
  seat_index INT NOT NULL CHECK (seat_index BETWEEN 0 AND 8),
  occupant_type poker_seat_occupant_type NOT NULL,
  poker_user_id TEXT REFERENCES poker_users(id) ON DELETE SET NULL,
  bot_name TEXT,
  bot_avatar_url TEXT,
  bot_profile poker_ai_bot_profile,
  stack INT NOT NULL DEFAULT 0,
  is_sitting_out BOOLEAN NOT NULL DEFAULT false,
  leave_after_hand BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, seat_index)
);

CREATE INDEX IF NOT EXISTS idx_poker_seats_user ON poker_table_seats (poker_user_id);

-- -----------------------------------------------------------------------------
-- hand history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS poker_game_hand_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id TEXT NOT NULL REFERENCES poker_table_rooms(id) ON DELETE CASCADE,
  hand_number INT NOT NULL,
  tier poker_table_tier NOT NULL,
  small_blind INT NOT NULL,
  big_blind INT NOT NULL,
  street_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  board_cards TEXT[] NOT NULL DEFAULT '{}',
  pot_total INT NOT NULL DEFAULT 0,
  side_pots JSONB,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  action_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB,
  UNIQUE (room_id, hand_number)
);

CREATE TABLE IF NOT EXISTS poker_game_hand_player_results (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  hand_id TEXT NOT NULL REFERENCES poker_game_hand_history(id) ON DELETE CASCADE,
  poker_user_id TEXT REFERENCES poker_users(id) ON DELETE SET NULL,
  seat_index INT NOT NULL,
  occupant_type poker_seat_occupant_type NOT NULL,
  bot_name TEXT,
  hole_cards TEXT[] NOT NULL DEFAULT '{}',
  starting_stack INT NOT NULL,
  ending_stack INT NOT NULL,
  net_delta INT NOT NULL,
  showed_down BOOLEAN NOT NULL DEFAULT false,
  hand_label TEXT,
  hand_rank_value BIGINT,
  won_amount INT NOT NULL DEFAULT 0,
  folded BOOLEAN NOT NULL DEFAULT false,
  went_all_in BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_poker_hand_results_user
  ON poker_game_hand_player_results (poker_user_id, hand_id);

-- -----------------------------------------------------------------------------
-- Seed daily quests
-- -----------------------------------------------------------------------------
INSERT INTO poker_quests (slug, kind, target_value, reward_points, title_key, description_key)
VALUES
  ('play-20-hands', 'PLAY_HANDS', 40, 5500, 'poker.quest.playHands.title', 'poker.quest.playHands.desc'),
  ('win-pair-or-better', 'WIN_HAND_PAIR_OR_BETTER', 3, 4500, 'poker.quest.winPair.title', 'poker.quest.winPair.desc'),
  ('fold-preflop-5', 'FOLD_PREFLOP', 15, 2800, 'poker.quest.foldPreflop.title', 'poker.quest.foldPreflop.desc'),
  ('win-3-pots', 'WIN_POTS', 8, 7000, 'poker.quest.winPots.title', 'poker.quest.winPots.desc')
ON CONFLICT (slug) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  reward_points = EXCLUDED.reward_points,
  active = true;

-- -----------------------------------------------------------------------------
-- Atomic credit helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION poker_credit_points(
  p_user_id UUID,
  p_delta INT,
  p_reason poker_points_ledger_reason,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poker_id TEXT;
  v_new_balance INT;
BEGIN
  IF p_delta = 0 THEN
    RAISE EXCEPTION 'delta must be non-zero';
  END IF;

  SELECT id INTO v_poker_id FROM poker_users WHERE user_id = p_user_id FOR UPDATE;
  IF v_poker_id IS NULL THEN
    RAISE EXCEPTION 'poker user not found';
  END IF;

  UPDATE poker_users
  SET points_balance = points_balance + p_delta,
      updated_at = now()
  WHERE id = v_poker_id
  RETURNING points_balance INTO v_new_balance;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient points';
  END IF;

  INSERT INTO poker_points_ledger (
    poker_user_id, delta, balance_after, reason, ref_type, ref_id, metadata
  ) VALUES (
    v_poker_id, p_delta, v_new_balance, p_reason, p_ref_type, p_ref_id, p_metadata
  );

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION poker_credit_points FROM PUBLIC;
GRANT EXECUTE ON FUNCTION poker_credit_points TO service_role;
