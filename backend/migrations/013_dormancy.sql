-- 013_dormancy.sql — 휴면 계정 정책 (FR-DORM-01~06, FR-NOTI-03)
-- 14일 미접속 시 자동 휴면 전환, 복귀 시 보상 패키지 + 7일 EXP 1.5배 버프,
-- 최초 복귀 시 방어권 3개 + 성향 재설문, 13일차 경고 알림.
-- 부팅 시 알파벳 순 idempotent 적용.

-- ─────────────────────────────────────────────────────────────
-- 1. users: 휴면/복귀 추적 컬럼 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_active_at             timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS dormant_since              timestamptz,
    ADD COLUMN IF NOT EXISTS dormant_returned_count     int  NOT NULL DEFAULT 0 CHECK (dormant_returned_count >= 0),
    ADD COLUMN IF NOT EXISTS return_buff_until          timestamptz,
    ADD COLUMN IF NOT EXISTS dormancy_warning_sent_date date,
    ADD COLUMN IF NOT EXISTS needs_reonboarding         boolean NOT NULL DEFAULT false;

-- 기존 사용자: last_active_at 을 last_login_at(우선) 또는 updated_at 으로 보정.
-- 이 마이그레이션은 schema_migrations 트래커에 의해 한 번만 실행되므로 무조건 backfill.
UPDATE users
   SET last_active_at = COALESCE(last_login_at, updated_at, created_at);

-- 워커 스윕 인덱스: ACTIVE 상태에서 오래된 last_active_at 빠르게 찾기.
CREATE INDEX IF NOT EXISTS idx_users_dormancy_sweep
    ON users (account_status, last_active_at)
    WHERE account_status = 'ACTIVE';
