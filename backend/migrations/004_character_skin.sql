-- 사용자가 선택한 2D 캐릭터 스킨 ID (빈 문자열이면 클라이언트가 레벨 기반 폴백).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS character_skin TEXT NOT NULL DEFAULT '';
