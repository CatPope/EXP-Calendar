-- 007_v14_persona_defense_shop.sql  (SRS v1.4)
-- (1) 구조화 페르소나: 이름/말투·성격/역사·배경/자주 하는 생각 분리 컬럼 (편집은 무료).
-- (2) 상태 메시지(대사): 통계·등급 화면에서 편집하는 HUD/쇼케이스 노출 대사 (페르소나와 분리).
-- (3) 방어권 인벤토리: 등급 하락 방어권 보유 수량 (상점 구매 시 증가, 사용 시 차감).
-- (4) 상점 시드 갱신(와이어프레임 08): 픽셀 모자 120 / 네온 오라 260 / 배경: 우주 400.

ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_name      text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_tone      text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_history   text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona_thoughts  text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message    text NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS defense_tickets   int  NOT NULL DEFAULT 0;

-- 기존 자유서술 persona_definition 을 '역사·배경'으로 1회 이관(빈 값만).
UPDATE users
   SET persona_history = persona_definition
 WHERE persona_history = '' AND persona_definition <> '';

-- 상점 시드 갱신: 신규 커스터마이징 3종 (이름 기준 멱등 삽입).
INSERT INTO items (name, category, price, description, effect)
SELECT '픽셀 모자', 'CUSTOMIZE', 120, '캐릭터 머리 장식', 'cosmetic:hat'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '픽셀 모자');
INSERT INTO items (name, category, price, description, effect)
SELECT '네온 오라', 'CUSTOMIZE', 260, '캐릭터 빛 효과', 'cosmetic:aura'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '네온 오라');
INSERT INTO items (name, category, price, description, effect)
SELECT '배경: 우주', 'CUSTOMIZE', 400, '쇼케이스 배경', 'cosmetic:bg_space'
 WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = '배경: 우주');

-- 구(舊) 단색 컬러 아이템은 와이어프레임 08에서 제외 → 정리.
-- 단, 구매 이력(purchases FK)이 있는 항목은 삭제하지 않는다(이력 보존 + FK 위반 방지).
DELETE FROM items
 WHERE effect IN ('color:cyan', 'color:gold')
   AND id NOT IN (SELECT item_id FROM purchases WHERE item_id IS NOT NULL);
