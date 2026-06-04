-- 008_demo_showcase_seed.sql  [DEMO DATA]
-- 쇼케이스 시연용 더미 유저 100명을 다양한 유형으로 생성한다.
-- 변화 요소: 닉네임/페르소나 이름, 레벨, 스킨(외형), 상태 대사, 말투, 성향,
--           장착·전시 칭호(페널티 포함), 완료/미달 일정(등급·잔디·성공률 분포).
-- 멱등: demo001 이 이미 있으면 전체 스킵. (down -v 시 재생성)
-- 정리하려면: DELETE FROM users WHERE email LIKE 'demo%@exp.local';  (schedules/user_titles는 CASCADE)

DO $$
DECLARE
  skins   text[] := ARRAY['m-01-1','m-09-4','f-01-2','f-10-1','f-18-4','s-04-4',
                          'su1-su1-student-male-05','su2-su2-student-male-09',
                          'su3-su3-student-male-13','tch-teacher-fmale-02','nk-029','e-14-1'];
  names   text[] := ARRAY['도트마왕','잔디요정','심야코더','느림보','불꽃맨','유령씨','새벽사냥꾼',
                          '칼퇴요정','갓생러','집순이','파워J','릴랙스','폭주기관차','조용한열정',
                          '꾸준왕','작심삼일','마감요정','루틴마스터','게으른천재','번개손'];
  tones   text[] := ARRAY['겉은 퉁명 속은 다정한 츤데레','매사 긍정 에너자이저','시니컬한 완벽주의자',
                          '느긋한 평화주의자','불타는 승부욕','잔잔한 관찰자'];
  stat    text[] := ARRAY['흥, 오늘 일정 정도는 가뿐하지','오늘도 한 걸음 더!','...조금만 더 누워있을까',
                          '해치웠다! 다음!','꾸준함이 답이다','마감은 나의 친구','새벽은 나의 시간',
                          '쉬엄쉬엄 가자','완벽하게 끝냈다','오늘의 나를 칭찬해'];
  tnames  text[] := ARRAY['첫 발걸음','꾸준러','새벽의 개척자','난관 돌파자','불굴의 의지','시간의 지배자','게으른 소환사'];
  i int; uid uuid; lvl int; texp int; tname text; tid uuid; nmod text; succ int; fail int; d int;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = 'demo001@exp.local') THEN
    RETURN; -- 이미 시드됨
  END IF;

  FOR i IN 1..100 LOOP
    lvl  := 5 + (i % 55);
    texp := lvl * lvl * 100 + (i * 13 % 100);

    INSERT INTO users (email, display_name, account_status, level, total_exp, current_points,
        tendency, character_skin, persona_name, persona_tone, persona_history, persona_thoughts, status_message)
      VALUES (
        'demo' || lpad(i::text, 3, '0') || '@exp.local',
        names[1 + (i % array_length(names, 1))] || i::text,
        'ACTIVE', lvl, texp, (i * 50) % 2000,
        (ARRAY['EASY','NORMAL','HARD'])[1 + (i % 3)],
        skins[1 + (i % array_length(skins, 1))],
        names[1 + (i % array_length(names, 1))] || i::text,
        tones[1 + (i % array_length(tones, 1))],
        '게으름의 던전에서 태어나 매일 퀘스트를 깨며 성장하는 데모 모험가 #' || i::text,
        '오늘 할 일만 끝내면 분명 뿌듯할 텐데...',
        stat[1 + (i % array_length(stat, 1))])
      RETURNING id INTO uid;

    -- 장착 칭호(7번째마다 페널티 칭호)
    tname := tnames[1 + (i % array_length(tnames, 1))];
    nmod  := CASE WHEN tname = '게으른 소환사' THEN '게으른' ELSE NULL END;
    SELECT id INTO tid FROM titles WHERE name = tname LIMIT 1;
    IF tid IS NOT NULL THEN
      INSERT INTO user_titles (user_id, title_id, is_equipped, is_displayed, negative_modifier, acquired_at)
        VALUES (uid, tid, true, true, nmod, now())
        ON CONFLICT (user_id, title_id) DO NOTHING;
    END IF;

    -- 짝수 유저는 전시 칭호 1개 추가(서로 다른 칭호)
    IF i % 2 = 0 THEN
      SELECT id INTO tid FROM titles WHERE name = tnames[1 + ((i + 3) % array_length(tnames, 1))] LIMIT 1;
      IF tid IS NOT NULL THEN
        INSERT INTO user_titles (user_id, title_id, is_equipped, is_displayed, negative_modifier, acquired_at)
          VALUES (uid, tid, false, true, NULL, now())
          ON CONFLICT (user_id, title_id) DO NOTHING;
      END IF;
    END IF;

    -- 완료 일정(잔디·등급용) + 미달 일정(성공률 분포로 등급 D~S 다양화)
    succ := 6 + (i % 10);  -- 6..15
    fail := (i % 5);       -- 0..4
    FOR d IN 1..succ LOOP
      INSERT INTO schedules (user_id, title, difficulty, status, due_date, completed_at, created_at)
        VALUES (uid, '데모 완료 일정 ' || d, (ARRAY['LOW','MEDIUM','HIGH'])[1 + (d % 3)], 'COMPLETED',
                now() - ((d % 28) || ' days')::interval,
                now() - ((d % 28) || ' days')::interval,
                now() - ((d % 28) || ' days')::interval);
    END LOOP;
    FOR d IN 1..fail LOOP
      INSERT INTO schedules (user_id, title, difficulty, status, due_date, created_at)
        VALUES (uid, '데모 미달 일정 ' || d, 'MEDIUM', 'OVERDUE',
                now() - ((d * 2) || ' days')::interval,
                now() - ((d * 2) || ' days')::interval);
    END LOOP;
  END LOOP;
END $$;
