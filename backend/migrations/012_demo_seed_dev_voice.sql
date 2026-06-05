-- 012_demo_seed_dev_voice.sql  [DEMO DATA]
-- 시연용 데이터:
--   1) dev@example.com 사용자 — 비밀번호 1234, 30일치 일정(오늘까지),
--      페널티 모디파이어가 적용된 칭호 1개 ('게으른 소환사' / 모디파이어 '게으른').
--   2) demoNNN@exp.local 사용자들(쇼케이스 표시 대상) 마다 서로 다른
--      "내 한마디" (persona_showcase_text + persona_llm_output) 채우기.
-- 멱등성: 일정/칭호/한마디는 이미 있으면 건너뛰거나 ON CONFLICT 로 무시.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== 1) dev@example.com 베이스 사용자 =====================================
INSERT INTO users (email, display_name, account_status, password_hash, tendency,
                   level, total_exp, current_points,
                   persona_name, persona_tone, persona_history, persona_thoughts,
                   status_message, character_skin)
  VALUES ('dev@example.com', '개발자 데모', 'ACTIVE',
          crypt('1234', gen_salt('bf', 4)),
          'NORMAL',
          10, 1000, 800,
          '개발자 데모',
          '시니컬한 완벽주의자',
          '심야 컴파일러와 함께 자란 데모 모험가.',
          '오늘 할 일을 끝내야 마음이 놓인다...',
          '오늘도 한 줄 더 적어보자.',
          'm-01-1')
  ON CONFLICT (email) DO UPDATE SET
    password_hash = CASE
      WHEN users.password_hash = '' THEN EXCLUDED.password_hash
      ELSE users.password_hash
    END;

-- ===== 2) dev@example.com 의 30일 일정 + 패널티 칭호 ========================
DO $$
DECLARE
  uid uuid;
  tid uuid;
  d   int;
  dt  text;
BEGIN
  SELECT id INTO uid FROM users WHERE email = 'dev@example.com';
  IF uid IS NULL THEN RETURN; END IF;

  -- 일정: 이미 데모 일정이 있으면 스킵.
  IF NOT EXISTS (SELECT 1 FROM schedules WHERE user_id=uid AND title LIKE '데모 일정%') THEN
    -- d=0 → 오늘(PENDING). d=29 → 29일 전. 매 5의 배수 날짜는 OVERDUE.
    FOR d IN 0..29 LOOP
      dt := (now() - (d || ' days')::interval)::text;
      IF d = 0 THEN
        INSERT INTO schedules (user_id, title, difficulty, status, due_date, created_at)
          VALUES (uid, '데모 일정 ' || (30 - d), 'HIGH', 'PENDING',
                  now() + interval '6 hours',
                  now());
      ELSIF d % 5 = 0 THEN
        INSERT INTO schedules (user_id, title, difficulty, status, due_date, created_at)
          VALUES (uid, '데모 일정 ' || (30 - d), 'MEDIUM', 'OVERDUE',
                  dt::timestamptz, dt::timestamptz);
      ELSE
        INSERT INTO schedules (user_id, title, difficulty, status, due_date, completed_at, created_at)
          VALUES (uid, '데모 일정 ' || (30 - d),
                  (ARRAY['LOW','MEDIUM','HIGH'])[1 + (d % 3)],
                  'COMPLETED',
                  dt::timestamptz, dt::timestamptz, dt::timestamptz);
      END IF;
    END LOOP;
  END IF;

  -- 페널티 칭호: '게으른 소환사' (모디파이어 '게으른') — 시연용 1개 장착/전시.
  SELECT id INTO tid FROM titles WHERE name = '게으른 소환사' LIMIT 1;
  IF tid IS NOT NULL THEN
    -- 다른 칭호의 is_equipped 를 끄고 이 칭호로 교체.
    UPDATE user_titles SET is_equipped = false WHERE user_id = uid;
    INSERT INTO user_titles (user_id, title_id, is_equipped, is_displayed, negative_modifier, acquired_at)
      VALUES (uid, tid, true, true, '게으른', now())
      ON CONFLICT (user_id, title_id) DO UPDATE SET
        is_equipped = true,
        is_displayed = true,
        negative_modifier = '게으른';
  END IF;
END $$;

-- ===== 3) 쇼케이스 더미 캐릭터들에게 "내 한마디" 채우기 =====================
-- 008 에서 status_message 만 단순 문자열로 들어가 있는 데모 사용자 100명에게
-- persona_showcase_text(원문) + persona_llm_output(변환 결과)를 부여한다.
-- 캐릭터의 persona_tone 분위기에 맞게 10가지 쌍을 인덱스로 분배.
DO $$
DECLARE
  origs text[] := ARRAY[
    '오늘 정말 열심히 했다.',
    '퇴근하고 싶다.',
    '아직 할 일이 산더미야.',
    '오늘은 일찍 끝내고 쉬자.',
    '왠지 의욕이 안 난다.',
    '드디어 끝났어.',
    '내일은 더 잘할 수 있을 것 같아.',
    '하루가 너무 길다.',
    '커피 한 잔 하고 계속.',
    '오늘 한 일이 의미 있었다.'
  ];
  outs text[] := ARRAY[
    '흥, 오늘 일정 정도는 가뿐히 처리했다고.',
    '에헤헤, 이제 좀 쉬어도 되지 않을까용?',
    '허허, 산을 넘어야 명예가 쌓이는 법이로다.',
    '...오늘은 일찍 마무리하고 휴식이다.',
    '음, 의욕이 부족한 날에도 한 걸음은 내딛어 보자꾸나.',
    '[처리 완료] 금일 임무 종료. 다음 작전 대기 중.',
    '내일은 분명 더 빛나는 하루가 될 거야!',
    '하루가 길다 한들, 그 끝엔 보상이 있노라.',
    '카페인 충전 완료. 다시 시작이다.',
    '오늘의 한 걸음이 내일의 발판이 된다.'
  ];
  rec record;
  idx int;
BEGIN
  FOR rec IN
    SELECT id, email FROM users
    WHERE email LIKE 'demo%@exp.local'
      AND (persona_llm_output IS NULL OR persona_llm_output = '')
  LOOP
    -- 'demo###' 의 번호로 인덱스 계산 (없으면 hash).
    idx := COALESCE(
      NULLIF(substring(rec.email FROM 'demo(\d+)'), '')::int,
      abs(hashtext(rec.email::text))
    ) % array_length(origs, 1) + 1;
    UPDATE users SET
      persona_showcase_text = origs[idx],
      persona_llm_output    = outs[idx],
      status_message        = outs[idx]
    WHERE id = rec.id;
  END LOOP;
END $$;
