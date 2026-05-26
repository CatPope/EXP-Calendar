-- Persona feature redesign: free-form definition + token-gated set/change.
-- Replaces fixed 'tsundere' / 'knight' presets with a single "캐릭터 설정권"
-- shop item; users write their own personality + history that the LLM uses
-- as a system prompt.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS persona_definition TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS persona_tokens     INT  NOT NULL DEFAULT 0;

-- Remove preset PERSONA items (effects persona:tsundere / persona:knight).
-- First clean dependent purchase records — these are historical no-ops since
-- the underlying item is being retired. Safe for dev/test; for a production
-- DB you'd archive purchases instead.
DELETE FROM purchases
WHERE item_id IN (SELECT id FROM items WHERE effect IN ('persona:tsundere', 'persona:knight'));

DELETE FROM items
WHERE effect IN ('persona:tsundere', 'persona:knight');

-- Add the new gating item.
INSERT INTO items (name, category, price, description, effect)
VALUES
    ('캐릭터 설정권', 'PERSONA', 200,
     '캐릭터의 성격과 역사를 새로 설정하거나 변경할 수 있는 권한 1회를 부여합니다.',
     'persona:token')
ON CONFLICT (name) DO NOTHING;

-- Reset legacy persona_character_type for users who selected one of the
-- removed presets — their stored definition is the new source of truth.
UPDATE users
SET persona_character_type = 'default'
WHERE persona_character_type IN ('tsundere', 'knight');
