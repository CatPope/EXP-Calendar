-- 009_cosmetics_titles_shop.sql
-- (1) 코스메틱 실제 적용: users.active_cosmetic (장착 중인 코스메틱 effect).
-- (2) 신규 칭호: 엔진이 지원하는 조건으로 자동 부여되도록 추가.
-- (3) 신규 상점 아이템: 코스메틱 2종 + 스킨 뽑기권(SUMMON 카테고리 신설).

ALTER TABLE users ADD COLUMN IF NOT EXISTS active_cosmetic text NOT NULL DEFAULT '';

-- items.category 에 'SUMMON' 추가 (기존 CHECK 교체).
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
   WHERE conrelid = 'items'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%category%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE items DROP CONSTRAINT %I', cname);
  END IF;
  ALTER TABLE items ADD CONSTRAINT items_category_check
    CHECK (category IN ('CUSTOMIZE','DEFENSE','PERSONA','SUMMON'));
END $$;

-- 신규 상점 아이템 (이름 기준 멱등).
INSERT INTO items (name, category, price, description, effect)
SELECT '황금 왕관', 'CUSTOMIZE', 500, '머리 위 황금 왕관', 'cosmetic:crown'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name='황금 왕관');
INSERT INTO items (name, category, price, description, effect)
SELECT '숲 배경', 'CUSTOMIZE', 350, '쇼케이스 숲 배경', 'cosmetic:bg_forest'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name='숲 배경');
INSERT INTO items (name, category, price, description, effect)
SELECT '스킨 뽑기권', 'SUMMON', 100, '스킨 뽑기 1회권', 'summon:ticket'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name='스킨 뽑기권');

-- 신규 칭호 (엔진 지원 조건 → 일정 완료 시 자동 부여). 이름 기준 멱등.
INSERT INTO titles (name, grade, color_hex, condition, description)
SELECT '꾸준한 일상', 'RARE', '#8B5CF6', 'COMPLETE_COUNT:10', '일정 누적 10개 완료'
 WHERE NOT EXISTS (SELECT 1 FROM titles WHERE name='꾸준한 일상');
INSERT INTO titles (name, grade, color_hex, condition, description)
SELECT '백일의 실천', 'EPIC', '#FFD700', 'COMPLETE_COUNT:100', '일정 누적 100개 완료'
 WHERE NOT EXISTS (SELECT 1 FROM titles WHERE name='백일의 실천');
INSERT INTO titles (name, grade, color_hex, condition, description)
SELECT '보름 연속', 'RARE', '#8B5CF6', 'STREAK:14', '14일 연속 일정 완료'
 WHERE NOT EXISTS (SELECT 1 FROM titles WHERE name='보름 연속');
INSERT INTO titles (name, grade, color_hex, condition, description)
SELECT '고난도 헌터', 'EPIC', '#FFD700', 'HIGH_COUNT:50', '난이도 HIGH 누적 50개 완료'
 WHERE NOT EXISTS (SELECT 1 FROM titles WHERE name='고난도 헌터');
INSERT INTO titles (name, grade, color_hex, condition, description)
SELECT '새벽 단골', 'EPIC', '#FFD700', 'MORNING_COUNT:30', '오전 6시 이전 완료 누적 30회'
 WHERE NOT EXISTS (SELECT 1 FROM titles WHERE name='새벽 단골');
