-- 011_user_password.sql
-- 데모/개발용 id+pw 로그인 구조화. 기존 hash 가 비어 있는 유저는 비밀번호 없이도
-- 로그인 허용 (후방 호환). 새 가입은 password 필수 + bcrypt 해시 저장.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text NOT NULL DEFAULT '';
