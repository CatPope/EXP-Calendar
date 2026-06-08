-- 010_stats_public.sql
-- 쇼케이스에서 내 통계를 공개할지 여부를 사용자가 직접 토글한다.
-- 기본값 true (오픈) — v1.4 까지의 동작과 동일.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stats_public boolean NOT NULL DEFAULT true;
