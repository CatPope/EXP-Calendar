# EXP Calendar — API 계약 & 게임 규칙 (MVP)

본 문서는 backend, frontend, infra subagent가 공유하는 단일 진실의 원천(SSoT)이다.
모든 응답은 `application/json; charset=utf-8`. 인증 필요 API는 `Authorization: Bearer <access_token>`.

## 0. 기본 응답 포맷

성공:
```json
{ "data": <payload> }
```
에러:
```json
{ "error": { "code": "string", "message": "string" } }
```

## 1. Auth

### POST /api/auth/google
- body: `{ "id_token": "string" }`
- res: `{ data: { access_token, refresh_token, user } }`

### POST /api/auth/dev-login  (DEV_MODE=true 일 때만)
- body: `{ "email": "string", "display_name": "string" }`
- res: `{ data: { access_token, refresh_token, user } }`
- 동일 email 존재 시 기존 사용자 반환, 없으면 생성

### POST /api/auth/refresh
- body: `{ "refresh_token": "string" }`
- res: `{ data: { access_token } }`

### POST /api/auth/logout
- res: `{ data: { ok: true } }`

## 2. User

### GET /api/me
```json
{
  "data": {
    "id": "uuid",
    "email": "string",
    "display_name": "string",
    "level": 1,
    "total_exp": 0,
    "exp_to_next_level": 100,
    "current_points": 0,
    "daily_points_earned": 0,
    "daily_points_cap": 200,
    "account_status": "ACTIVE",
    "persona_character_type": "default",
    "persona_definition": "",
    "persona_tokens": 0,
    "tendency": "NORMAL",
    "equipped_title": { "id": "uuid", "name": "string", "grade": "RARE", "color_hex": "#8B5CF6", "negative_modifier": null }
  }
}
```

### POST /api/me/onboarding
- body: `{ "tendency": "EASY" | "NORMAL" | "HARD" }`
- res: `{ data: { ok: true } }`
- 효과: 초기 레벨/난이도 가중치 설정 (FR-GAME-01)

## 3. Schedules

### GET /api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD
- res: `{ data: [Schedule, ...] }`

### POST /api/schedules
- body: `{ "title": "string", "description"?: "string", "difficulty": "LOW"|"MEDIUM"|"HIGH", "due_date": "ISO8601" }`
- res: `{ data: Schedule }`

### PATCH /api/schedules/:id
- body: partial Schedule
- res: `{ data: Schedule }`

### DELETE /api/schedules/:id
- res: `{ data: { ok: true } }`

### POST /api/schedules/:id/complete
- 일정 due_date(KST 일자)가 오늘보다 미래면 거부: `400 NOT_YET_DUE`
- 이미 완료 상태면 거부: `409 ALREADY_COMPLETED`
- res:
```json
{
  "data": {
    "schedule": Schedule,
    "reward": {
      "exp_gained": 25,
      "points_gained": 12,
      "level_up": false,
      "new_level": null,
      "new_titles": [Title, ...],
      "daily_cap_reached": false
    }
  }
}
```

### POST /api/schedules/:id/uncomplete
- 완료(COMPLETED)된 일정만 가능, 아니면 `400 NOT_COMPLETED`
- 지급된 EXP/포인트/레벨/일일한도를 역산(차감)하고 reward_log 삭제. 칭호는 회수하지 않음(마일스톤)
- res: `{ data: { schedule: Schedule, exp_removed, points_removed, new_level } }`

### PATCH /api/me/character
- body: `{ "skin": "string" }` ← 2D 캐릭터 스킨 ID
- res: `{ data: { ok: true } }`

### POST /api/auth/dev-signup (dev)
- body: `{ "email": "string", "display_name"?: "string" }`
- 기존 계정이면 `409 ALREADY_EXISTS`. 신규 생성 후 로그인 토큰 발급
- dev-login은 미등록 이메일에 `404 NEED_SIGNUP` 반환(자동 생성 안 함)

Schedule 객체:
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "difficulty": "LOW",
  "status": "PENDING" | "COMPLETED" | "OVERDUE",
  "due_date": "ISO8601",
  "google_event_id": null,
  "completed_at": null,
  "created_at": "ISO8601"
}
```

## 4. Quests

### GET /api/quests/today
- res: `{ data: [{ quest_type, completed, reward_points }] }`
- 항상 3종: `ADD_PLAN`(20P), `COMPLETE_PLAN`(30P), `VISIT_SHOWCASE`(15P) — `[v1.3]` 차등 보상

### POST /api/quests/:quest_type/complete
- res: `{ data: { completed: true, reward_points, bonus_points, streak_mult, current_points } }`
- `reward_points`: 해당 퀘스트 차등 보상(일일 한도 적용 후 실지급액)
- `bonus_points`: 3종 전체 완료 시 +50P 보너스(하루 1회) `[v1.3]`
- `streak_mult`: 7일 연속 전체 완료 시 ×2 `[v1.3]`

## 5. Shop

### GET /api/shop/items
- res: `{ data: [Item, ...] }`

### POST /api/shop/purchase
- body: `{ "item_id": "uuid" }`
- res: `{ data: { purchase: Purchase, remaining_points: 88 } }`

Item:
```json
{
  "id": "uuid",
  "name": "string",
  "category": "CUSTOMIZE" | "DEFENSE" | "PERSONA",
  "price": 100,
  "description": "string",
  "effect": "string"
}
```

## 6. Titles

### GET /api/titles/me
- res: `{ data: [UserTitle, ...] }`

### PATCH /api/titles/:id/equip
- body: `{ "is_equipped"?: boolean, "is_displayed"?: boolean }`
- res: `{ data: UserTitle }`

UserTitle:
```json
{
  "id": "uuid",
  "title": { "id":"uuid","name":"string","grade":"RARE","color_hex":"#8B5CF6","icon_url":"string" },
  "is_equipped": false,
  "is_displayed": true,
  "negative_modifier": null,
  "acquired_at": "ISO8601"
}
```

## 7. Persona / Showcase

> **흐름**: ① 상점에서 `캐릭터 설정권` 구매(`persona_tokens += 1`) → ② `POST /api/persona/define` 으로 자유 정의(`persona_tokens -= 1`) → ③ `/api/persona/generate` 또는 `/showcase`가 저장된 definition을 Gemini Flash system prompt로 사용. 키 미설정 시 mock 폴백.

### POST /api/persona/define
- body: `{ "definition": "string" }`  ← 캐릭터 성격·역사(10~2000자)
- res: `{ data: { persona_definition: "string", persona_tokens: N } }`
- 전제: `persona_tokens >= 1`. 부족 시 `400 NO_PERSONA_TOKEN`. 1회 호출 = 1토큰 소모.
- 동작: definition을 사용자 행에 저장하고 토큰 1 차감 (단일 트랜잭션).

### POST /api/persona/generate
- body: `{ "text": "string", "character_type"?: "string", "definition"?: "string" }`
  - `definition` 제공 시 미리보기용 임시 override (저장 X). 미제공 시 저장된 `persona_definition` 사용.
- res: `{ data: { llm_output: "string", character_type: "string", used_definition: bool } }`
- `GEMINI_API_KEY` 없을 시 deterministic mock 사용

### PATCH /api/me/stats-public
- body: `{ "public": true | false }`
- res: `{ data: User }` (전체 user 반환; `stats_public` 갱신됨)
- 쇼케이스에서 본인 통계 노출 여부를 토글한다. 본인 페이지(`/identity`)는 토글과 무관하게 항상 본다.

### POST /api/persona/showcase
- body: `{ "text": "string", "llm_output": "string" }`
  - `text` — 사용자가 입력한 원문
  - `llm_output` — 클라이언트가 직전에 `/api/persona/generate` 로 받은 변환 결과 (필수)
- res: `{ data: { showcase_text, llm_output, used_definition: bool } }`
- **LLM 을 재호출하지 않는다** — 받은 `llm_output` 을 그대로 저장. 사용자에게 보여준 "변환 결과(미리보기)" 와 "게시 결과"가 항상 동일하도록 보장.
- 두 필드 중 하나라도 비어 있으면 400 → 클라이언트는 게시 전에 반드시 변환(`/generate`)을 거쳐야 한다.
- 모네타이제이션 경계(FR-SHOP-03)는 `/generate` 가 (definition override 없이) 저장된 persona 로만 호출되도록 UI 가 보장한다.

### GET /api/showcase/:user_id/series?period=week|month|year
- 쇼케이스 통계 추이 데이터.
- 대상이 `stats_public=false` 이고 viewer != target 이면 403 `STATS_PRIVATE`.
- res: `{ data: SeriesPoint[] }` ( `/api/stats/series` 와 동일 형식 )

### GET /api/showcase/:user_id
- res:
```json
{
  "data": {
    "user_id": "uuid",
    "display_name": "string",
    "level": 5,
    "rating_grade": "B",
    "equipped_title": Title,
    "displayed_titles": [Title, ...],
    "persona_showcase_text": "string",
    "persona_llm_output": "string",
    "grass": { "YYYY-MM-DD": 2, ... },
    "stats_public": true,
    "summary": StatsSummary | null
  }
}
```
- `stats_public=false` 이고 viewer != target 이면 `summary` 가 빠지고 `grass` 도 빈 객체로 반환된다.
- 본인 페이지(viewer == target)는 토글과 무관하게 항상 풀 데이터를 본다.
- 본인의 상세 일정/실패율은 노출하지 않음 (FR-SOC-03 — `summary` 안의 success_rate 는 공개 허용 시에만)

### GET /api/showcase/recommendations?q=
- res: `{ data: [{ user_id, display_name, level, equipped_title }] }`  ← 추천 목록 (다른 사용자 최대 20)
- `q` 제공 시 `display_name` 부분 일치(대소문자 무시) 검색 결과를 반환한다 (FR-SOC-04). 미제공 시 레벨순 추천.

## 8. Stats

### GET /api/stats/grass?days=365
- res: `{ data: { "YYYY-MM-DD": completed_count, ... } }`

### GET /api/stats/series?period=week|month|year
- res: `{ data: [{ date: "YYYY-MM-DD", success: N, fail: N }] }`

### GET /api/stats/summary `[v1.3]`
- res: `{ data: { total_completed, total_failed, success_rate, rating_grade, current_streak, longest_streak } }`
- `rating_grade`: 누적 성공률 5단계 D~S (FR-STAT-03). 성공률 ≥0.95=S, ≥0.85=A, ≥0.70=B, ≥0.50=C, else D

## 9. Notifications

### GET /api/notifications/vapid
- res: `{ data: { public_key: "base64url" } }` ← 브라우저 PushManager 구독용 VAPID 공개키. 키 미설정 시 부팅마다 임시 키 생성.

### POST /api/notifications/subscribe
- body: WebPushSubscription JSON `{ endpoint, keys: { p256dh, auth } }` (브라우저 `PushSubscription.toJSON()`)
- res: `{ data: { ok: true } }`
- 백그라운드 worker가 매분 일정 리마인더(사용자 `reminder_minutes` 전)와 OVERDUE 스윕(페널티 부착)을 수행한다. **실제 Web Push 발송 구현됨**(VAPID-signed aes128gcm, `webpush-go`). 발송 실패 410/404 구독은 자동 삭제. `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` 미설정 시 부팅마다 임시 키 생성(프론트는 `/vapid`로 현재 키를 받아 구독).

## 10. Summon · Character Collection `[v1.3]` (FR-SUMMON-01~05)

### GET /api/summon/info
- res: `{ data: { rates, pickup_rates, cost_single:100, cost_multi:900, multi_count:10, pity_threshold:90, pity_counter, points, tickets, ticket_price:100 } }`

### GET /api/summon/collection
- res: `{ data: { catalog: [Character...], owned: [OwnedCharacter...] } }`
- Character: `{ id, name, rarity, sprite_key, is_pickup }` — `sprite_key`는 frontend `characters.generated.ts` id
- OwnedCharacter: Character + `{ count, equipped }`

### POST /api/summon/draw
- body: `{ "count": 1|10, "cost_type": "POINTS"|"TICKET" }`
- res: `{ data: { draws:[{character,is_new,refund_points}], spent_points, spent_tickets, refunded_points, remaining_points, remaining_tickets, pity_counter } }`
- 비용: 단차 100P/1티켓, 10연차 900P/10티켓. 10연차는 RARE 이상 1개 확정. 천장 90회. 중복은 포인트 환급(COMMON 10/RARE 30/EPIC 80/LEGENDARY 200).
- 잔액 부족: `400 INSUFFICIENT_POINTS` / `400 INSUFFICIENT_TICKETS`

### POST /api/summon/equip
- body: `{ "character_id": "uuid" }` — 보유 캐릭터 1개를 활성 캐릭터로 장착. 미보유 시 `403 NOT_OWNED`
- res: `{ data: { ok: true } }`

### POST /api/summon/tickets/buy
- body: `{ "count": N }` — 1티켓 = 100P
- res: `{ data: { tickets, remaining_points } }`

## 11. Settings · Account `[v1.3]` (FR-SET-01~06)

### GET /api/settings
- res: `{ data: { language, timezone, week_start, time_format, theme, character_scale, gcal_sync_enabled, notification_prefs, reminder_minutes } }`

### PATCH /api/settings
- body: partial settings (whitelist). `notification_prefs`는 객체. `reminder_minutes` ∈ {5,10,15,30,60}.
- res: `{ data: Settings }`

### GET /api/me/export
- res: 사용자 데이터 JSON 스냅샷(profile/settings/schedules/titles/characters/purchases). FR-SET-03 데이터 내보내기

### POST /api/me/reset
- 계정 게임 데이터 초기화(복구 불가, FR-SET-03). 일정·도감·칭호·구매·설정 삭제 + 진행도 리셋(계정 행은 유지).
- res: `{ data: { ok: true } }`

---

## 게임 규칙

### EXP / Points 공식

| 난이도 | base EXP | base Points |
|--------|---------:|------------:|
| LOW    | 10       | 5           |
| MEDIUM | 25       | 12          |
| HIGH   | 50       | 25          |

- **저레벨 가중치 (FR-GAME-03)**: `level < 10`일 때 EXP/Points 모두 ×1.5
- **온보딩 tendency 가중치**: EASY=1.2x, NORMAL=1.0x, HARD=0.8x (난이도 인플레이션 방지)
- 최종 = round(base × level_bonus × tendency_bonus)

### 레벨 공식

- `level = 1 + floor(sqrt(total_exp / 100))`
- `exp_to_next_level = ((level)^2 * 100) - total_exp`
- 레벨 1→2: 100 EXP, 2→3: 300 EXP 누적 등

### 일일 한도 (DC-04, FR-GAME-05)

- `DAILY_POINTS_CAP = 200`
- 매일 0시(KST) reset (또는 첫 적립 시점에 lazy reset)
- 초과분은 잘림. EXP에는 한도 없음.

### 일일 퀘스트 (FR-GAME-04/06) `[v1.3]`

- `ADD_PLAN` — 오늘 일정 2개 이상 추가 → 자동 완료, **20P**
- `COMPLETE_PLAN` — 오늘 일정 1개 이상 완료 → 자동 완료, **30P**
- `VISIT_SHOWCASE` — 다른 사용자 쇼케이스 1회 이상 방문 → 자동 완료, **15P**
- **3종 전체 완료 보너스**: +50P (하루 1회)
- **스트릭 보너스**: 7일 연속 전체 완료 시 모든 퀘스트 포인트 ×2
- 모든 포인트는 일일 한도(200) 적용. 매일 0시 reset.

### 칭호 자동 부여 (FR-TITLE-01) `[v1.3]` — 8종 (SRS Appendix C)

조건은 `titles.condition` 컬럼에 `KIND:THRESHOLD` 형식 저장, `engine.go`가 파싱·평가:

| 칭호 | 등급 | 색상 | condition | 조건 |
|------|------|------|-----------|------|
| 첫 발걸음 | COMMON | #06D6A0 | `COMPLETE_COUNT:1` | 첫 일정 완료 |
| 꾸준러 | RARE | #8B5CF6 | `STREAK:7` | 7일 연속 완료 |
| 새벽의 개척자 | RARE | #8B5CF6 | `MORNING_COUNT:10` | 오전 6시 이전 완료 10회 |
| 난관 돌파자 | EPIC | #FFD700 | `HIGH_COUNT:20` | HIGH 난이도 20개 완료 |
| 불굴의 의지 | EPIC | #FFD700 | `STREAK:30` | 30일 연속 |
| 시간의 지배자 | LEGENDARY | #FF6B6B | `STREAK:100` | 100일 연속 |
| 게으른 소환사 | COMMON | #8B949E | `OVERDUE_COUNT:5` | (부정) OVERDUE 누적 5회 |
| 전설의 수집가 | LEGENDARY | #FFD700 | `LEGENDARY_CHAR:1` | (히든) LEGENDARY 캐릭터 1종 보유 |

평가 시점: 일정 완료 후(커밋 뒤) 사용자 누적 통계로 미보유 칭호를 부여.

### 페널티 (FR-TITLE-03/04)

- 백그라운드 worker가 due_date 경과 PENDING 일정을 `OVERDUE`로 전환하면서 `users.overdue_count++`, 장착 칭호에 `negative_modifier`("게으른") 부착
- 정상 일정 완료 1회 또는 "등급 하락 방어권"(DEFENSE) 구매로 modifier 제거
- 시스템이 임의 초기화 금지 (DC-07)

### 소환 (가챠) 확률·천장 (FR-SUMMON-02/03) `[v1.3]`

- 기본 확률: COMMON 60% / RARE 28% / EPIC 9% / LEGENDARY 3%
- 픽업 배너 상시 적용: LEGENDARY 2배(6%), 나머지는 COMMON이 흡수(57%)
- 단차 100P/1티켓, 10연차 900P/10티켓. 10연차는 RARE 이상 1개 확정
- 천장: 90회 연속 LEGENDARY 미획득 시 다음 소환 확정
- 중복 환급: COMMON 10 / RARE 30 / EPIC 80 / LEGENDARY 200 P

### 상점 시드 아이템

| 이름 | category | price | effect |
|------|----------|------:|--------|
| 캐릭터 컬러: 시안 | CUSTOMIZE | 100 | 캐릭터 색상 변경 |
| 캐릭터 컬러: 골드 | CUSTOMIZE | 200 | 캐릭터 색상 변경 |
| 등급 하락 방어권 | DEFENSE | 300 | 페널티 1회 방어 |
| 페르소나: 츤데레 | PERSONA | 150 | 말투를 츤데레로 |
| 페르소나: 용감한 기사 | PERSONA | 150 | 말투를 기사로 |

### LLM 페르소나 (FR-SOC-02)

System Prompt 템플릿:
```
당신은 '{character_type}' 성격의 캐릭터입니다.
사용자가 입력한 텍스트를 이 캐릭터의 말투로 자연스럽게 변환하세요.
원문의 의미는 유지하되 1~3문장 이내로 답하고, 다른 설명은 포함하지 마세요.
사용자의 칭호: {titles}
```
- 프롬프트 인젝션 방어: 사용자 입력은 user message로만 전달, 시스템 명령 무시 지시 포함
- GEMINI_API_KEY 없으면 character_type별 deterministic suffix 추가 (mock)

---

## UI 테마 (UI-02)

- 배경: `#0D1117`
- 표면: `#161B22`
- 표면-2: `#21262D`
- 보더: `#30363D`
- 텍스트-1: `#E6EDF3`
- 텍스트-2: `#8B949E`
- 강조(purple): `#8B5CF6`
- 성공(cyan): `#06D6A0`
- 보상(gold): `#FFD700`
- 경고(red): `#FF6B6B`

## 환경 변수

Backend:
- `DATABASE_URL` (예: `postgres://exp:exp@db:5432/expcalendar?sslmode=disable`)
- `JWT_SECRET`
- `JWT_ACCESS_TTL_MIN=60`
- `JWT_REFRESH_TTL_DAYS=14`
- `GOOGLE_OAUTH_CLIENT_ID` (선택)
- `GEMINI_API_KEY` (선택, 없으면 mock)
- `LLM_MODEL=gemini-2.0-flash`
- `DEV_MODE=true`
- `PORT=8080`
- `ALLOWED_ORIGINS=http://localhost:3000`

Frontend:
- `NEXT_PUBLIC_APP_MODE=dev` — 값: `dev` | `prod`. 단일 플래그가 dev/prod 분기 + API base URL 파생을 모두 결정한다.
  - `dev`: 브라우저가 `:3000` → `:8080` 백엔드 직접 호출 + dev-login 폼 노출
  - `prod`: 같은 오리진 `/api` 로 호출 → nginx 가 backend 프록시 + dev-login 폼 숨김
  - `frontend/lib/api.ts` 가 `APP_MODE` 로부터 `BASE_URL` 을 파생. 별도 `NEXT_PUBLIC_API_BASE_URL` 변수는 사용하지 않는다.
- `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` (선택)
