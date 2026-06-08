-- v1.3 features: 통합 설정, 소환·캐릭터 수집, 칭호 8종 정합 (SRS v1.3 Appendix C/D, 3.2.9/3.2.10)
-- 부팅 시 알파벳 순 idempotent 적용. 기존 001_init.sql 은 수정하지 않는다.

-- ─────────────────────────────────────────────────────────────
-- 1. users: 소환 재화 + 천장 카운터 + 활성(장착) 캐릭터
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS summon_tickets      int  NOT NULL DEFAULT 0 CHECK (summon_tickets >= 0),
    ADD COLUMN IF NOT EXISTS pity_counter        int  NOT NULL DEFAULT 0 CHECK (pity_counter >= 0),
    ADD COLUMN IF NOT EXISTS overdue_count       int  NOT NULL DEFAULT 0 CHECK (overdue_count >= 0),
    ADD COLUMN IF NOT EXISTS last_quest_bonus_date date,
    ADD COLUMN IF NOT EXISTS active_character_id uuid;

-- schedules: 리마인더 발송 1회 마킹 (FR-NOTI-02 중복 발송 방지)
ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- account_status 에 DORMANT 허용 (자료사전 3.4.2). 기존 CHECK 교체.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users
    ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('ACTIVE','SUSPENDED','DELETED','DORMANT'));

-- ─────────────────────────────────────────────────────────────
-- 2. user_settings (통합 설정 — FR-SET-01~06, ERD USER_SETTINGS)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
    user_id           uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    language          text NOT NULL DEFAULT 'ko',
    timezone          text NOT NULL DEFAULT 'Asia/Seoul',
    week_start        text NOT NULL DEFAULT 'SUN' CHECK (week_start IN ('SUN','MON')),
    time_format       text NOT NULL DEFAULT 'H24' CHECK (time_format IN ('H12','H24')),
    theme             text NOT NULL DEFAULT 'cosmic_purple',
    character_scale   real NOT NULL DEFAULT 1.0 CHECK (character_scale IN (0.8, 1.0, 1.3)),
    gcal_sync_enabled boolean NOT NULL DEFAULT false,
    notification_prefs jsonb NOT NULL DEFAULT '{
        "push": true,
        "schedule_reminder": true,
        "dormancy_warning": true,
        "title_change": true,
        "daily_quest_reset": false
    }'::jsonb,
    reminder_minutes  int  NOT NULL DEFAULT 15 CHECK (reminder_minutes IN (5,10,15,30,60)),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 3. characters (가챠 도감 마스터 — ERD CHARACTER)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS characters (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL UNIQUE,
    rarity     text NOT NULL CHECK (rarity IN ('COMMON','RARE','EPIC','LEGENDARY')),
    sprite_key text NOT NULL DEFAULT '',   -- frontend characters.generated.ts 의 id
    is_pickup  boolean NOT NULL DEFAULT false
);

-- 활성 캐릭터 FK (characters 생성 후 연결)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_active_character_fk;
ALTER TABLE users
    ADD CONSTRAINT users_active_character_fk
    FOREIGN KEY (active_character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. user_characters (보유 도감 — ERD USER_CHARACTER)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_characters (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    count        int  NOT NULL DEFAULT 1 CHECK (count >= 1),
    acquired_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_user_characters_user ON user_characters(user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. summon_log (소환 이력 — ERD SUMMON_LOG)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS summon_log (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    cost_type    text NOT NULL CHECK (cost_type IN ('POINTS','TICKET')),
    pity_counter int  NOT NULL DEFAULT 0,
    summoned_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_summon_log_user ON summon_log(user_id, summoned_at);

-- ─────────────────────────────────────────────────────────────
-- 6. 칭호 8종 정합 (SRS v1.3 Appendix C). 기존 v1.2 칭호 제거 후 재시드.
--    condition 포맷: KIND:THRESHOLD (engine.go TitlesUnlockedFor 가 파싱)
-- ─────────────────────────────────────────────────────────────
DELETE FROM titles
WHERE name IN ('첫걸음','초보 모험가','성실한 자','달인','전설의 시간 마법사','꾸준한 자');

INSERT INTO titles (name, grade, color_hex, condition, description) VALUES
    ('첫 발걸음',     'COMMON',    '#06D6A0', 'COMPLETE_COUNT:1',  '첫 일정 1개 완료'),
    ('꾸준러',        'RARE',      '#8B5CF6', 'STREAK:7',          '7일 연속 일정 완료'),
    ('새벽의 개척자', 'RARE',      '#8B5CF6', 'MORNING_COUNT:10',  '오전 6시 이전 일정 완료 누적 10회'),
    ('난관 돌파자',   'EPIC',      '#FFD700', 'HIGH_COUNT:20',     '난이도 HIGH 일정 누적 20개 완료'),
    ('불굴의 의지',   'EPIC',      '#FFD700', 'STREAK:30',         '30일 연속 스트릭 달성'),
    ('시간의 지배자', 'LEGENDARY', '#FF6B6B', 'STREAK:100',        '100일 무결점 스트릭 달성'),
    ('게으른 소환사', 'COMMON',    '#8B949E', 'OVERDUE_COUNT:5',   '(부정) 기한 초과 누적 5회'),
    ('전설의 수집가', 'LEGENDARY', '#FFD700', 'LEGENDARY_CHAR:1',  '(히든) 도감에 LEGENDARY 캐릭터 1종 이상 보유')
ON CONFLICT (name) DO UPDATE
    SET grade       = EXCLUDED.grade,
        color_hex   = EXCLUDED.color_hex,
        condition   = EXCLUDED.condition,
        description = EXCLUDED.description;

-- ─────────────────────────────────────────────────────────────
-- 7. 캐릭터 카탈로그 시드 (sprite_key = pipoya 매니페스트 id)
--    COMMON 10 / RARE 8 / EPIC 4 / LEGENDARY 2 (= 24종)
-- ─────────────────────────────────────────────────────────────
INSERT INTO characters (name, rarity, sprite_key, is_pickup) VALUES
    ('마을 청년',     'COMMON', 'm-01-1', false),
    ('마을 상인',     'COMMON', 'm-02-1', false),
    ('떠돌이',        'COMMON', 'm-03-1', false),
    ('견습 농부',     'COMMON', 'm-04-1', false),
    ('성실한 일꾼',   'COMMON', 'm-05-1', false),
    ('마을 처녀',     'COMMON', 'f-01-1', false),
    ('약초상',        'COMMON', 'f-02-1', false),
    ('여관 종업원',   'COMMON', 'f-03-1', false),
    ('견습 마법사',   'COMMON', 'f-04-1', false),
    ('음유시인',      'COMMON', 'f-05-1', false),
    ('수습 병사',     'RARE',   's-01-1', false),
    ('근위병',        'RARE',   's-02-1', false),
    ('창병',          'RARE',   's-03-1', false),
    ('궁수대장',      'RARE',   's-04-1', false),
    ('방패 기사',     'RARE',   's-05-1', false),
    ('정예 검사',     'RARE',   's-06-1', false),
    ('성기사',        'RARE',   's-07-1', false),
    ('그림자 닌자',   'RARE',   'nk-001', false),
    ('마계 정찰병',   'EPIC',   'e-01-1', false),
    ('지옥 사냥꾼',   'EPIC',   'e-02-1', false),
    ('흑마도사',      'EPIC',   'e-03-1', true),
    ('심연의 기사',   'EPIC',   'e-04-1', false),
    ('마왕',          'LEGENDARY', 'b-01',  true),
    ('전설의 그림자', 'LEGENDARY', 'nk-032', false)
ON CONFLICT (name) DO NOTHING;
