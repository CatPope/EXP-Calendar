-- EXP Calendar initial schema (SRS 3.4.1 ERD)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users
CREATE TABLE IF NOT EXISTS users (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email                    text NOT NULL UNIQUE,
    display_name             text NOT NULL DEFAULT '',
    google_sub               text UNIQUE,
    oauth_access_token_enc   text,
    oauth_refresh_token_enc  text,
    account_status           text NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE','SUSPENDED','DELETED')),
    level                    int  NOT NULL DEFAULT 1,
    total_exp                int  NOT NULL DEFAULT 0,
    current_points           int  NOT NULL DEFAULT 0,
    daily_points_earned      int  NOT NULL DEFAULT 0,
    daily_points_earned_date date NOT NULL DEFAULT CURRENT_DATE,
    tendency                 text NOT NULL DEFAULT 'NORMAL' CHECK (tendency IN ('EASY','NORMAL','HARD')),
    persona_character_type   text NOT NULL DEFAULT 'default',
    persona_showcase_text    text NOT NULL DEFAULT '',
    persona_llm_output       text NOT NULL DEFAULT '',
    last_login_at            timestamptz,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

-- schedules
CREATE TABLE IF NOT EXISTS schedules (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           text NOT NULL,
    description     text NOT NULL DEFAULT '',
    difficulty      text NOT NULL DEFAULT 'MEDIUM' CHECK (difficulty IN ('LOW','MEDIUM','HIGH')),
    status          text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','COMPLETED','OVERDUE')),
    due_date        timestamptz NOT NULL,
    google_event_id text,
    completed_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedules_user_due ON schedules(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_status ON schedules(user_id, status);

-- titles (master)
CREATE TABLE IF NOT EXISTS titles (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    grade       text NOT NULL CHECK (grade IN ('COMMON','RARE','EPIC','LEGENDARY')),
    color_hex   text NOT NULL DEFAULT '#8B5CF6',
    icon_url    text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    condition   text NOT NULL DEFAULT '' -- e.g. "LEVEL:3" or "STREAK:7"
);

-- user_titles
CREATE TABLE IF NOT EXISTS user_titles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_id          uuid NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    is_equipped       boolean NOT NULL DEFAULT false,
    is_displayed      boolean NOT NULL DEFAULT true,
    negative_modifier text,
    acquired_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, title_id)
);
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);

-- quest_log
CREATE TABLE IF NOT EXISTS quest_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_date    date NOT NULL DEFAULT CURRENT_DATE,
    quest_type    text NOT NULL CHECK (quest_type IN ('ADD_PLAN','COMPLETE_PLAN','VISIT_SHOWCASE')),
    completed     boolean NOT NULL DEFAULT false,
    reward_points int NOT NULL DEFAULT 50,
    completed_at  timestamptz,
    UNIQUE(user_id, quest_date, quest_type)
);
CREATE INDEX IF NOT EXISTS idx_quest_log_user_date ON quest_log(user_id, quest_date);

-- items (shop catalog)
CREATE TABLE IF NOT EXISTS items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL UNIQUE,
    category    text NOT NULL CHECK (category IN ('CUSTOMIZE','DEFENSE','PERSONA')),
    price       int  NOT NULL CHECK (price >= 0),
    description text NOT NULL DEFAULT '',
    effect      text NOT NULL DEFAULT ''
);

-- purchases
CREATE TABLE IF NOT EXISTS purchases (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id     uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    payment_method text NOT NULL DEFAULT 'POINTS',
    price_paid  int  NOT NULL,
    purchased_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);

-- user_stats (aggregate cache; optional usage)
CREATE TABLE IF NOT EXISTS user_stats (
    user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_completed   int NOT NULL DEFAULT 0,
    total_failed      int NOT NULL DEFAULT 0,
    current_streak    int NOT NULL DEFAULT 0,
    last_completed_at timestamptz,
    rating_grade      text NOT NULL DEFAULT 'C'
);

-- personas (history of generations) — optional
CREATE TABLE IF NOT EXISTS personas (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_type text NOT NULL DEFAULT 'default',
    input_text     text NOT NULL,
    output_text    text NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_personas_user ON personas(user_id, created_at DESC);

-- reward_log
CREATE TABLE IF NOT EXISTS reward_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id    uuid REFERENCES schedules(id) ON DELETE SET NULL,
    source         text NOT NULL CHECK (source IN ('SCHEDULE','QUEST','OTHER')),
    quest_type     text,
    exp_gained     int  NOT NULL DEFAULT 0,
    points_gained  int  NOT NULL DEFAULT 0,
    occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reward_log_user_date ON reward_log(user_id, occurred_at);

-- refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token       text PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    revoked     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint     text NOT NULL,
    p256dh       text NOT NULL DEFAULT '',
    auth         text NOT NULL DEFAULT '',
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, endpoint)
);
