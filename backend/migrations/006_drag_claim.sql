-- 006_drag_claim.sql
-- (1) 일정 시간 범위: schedules 에 시작/종료 시각 추가 (주간뷰 드래그 범위 지정용).
--     기존 행은 NULL = 종일/시각 미지정으로 취급.
-- (2) 퀘스트 수동 보상 수령: quest_log 에 claimed 플래그 추가.
--     기존에 이미 완료된 퀘스트는 구(舊) 로직에서 자동 지급되었으므로 claimed=true 로
--     백필하여 재수령(이중 지급)을 막는다.

ALTER TABLE schedules  ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE schedules  ADD COLUMN IF NOT EXISTS end_time   timestamptz;

ALTER TABLE quest_log  ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT false;
UPDATE quest_log SET claimed = true WHERE completed = true AND claimed = false;
