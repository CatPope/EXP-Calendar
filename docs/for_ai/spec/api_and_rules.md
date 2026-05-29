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
- 항상 3종: `ADD_PLAN`, `COMPLETE_PLAN`, `VISIT_SHOWCASE`

### POST /api/quests/:quest_type/complete
- res: `{ data: { completed: true, reward_points: 50, current_points: 123 } }`

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

### POST /api/persona/showcase
- body: `{ "text": "string" }`  ← 사용자가 쇼케이스에 게시할 원문
- res: `{ data: { showcase_text, llm_output, used_definition: bool } }`
- **항상 저장된 `persona_definition` 사용** — 클라이언트의 character_type/definition hint 무시 (FR-SHOP-03 monetization 경계)

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
    "grass": { "YYYY-MM-DD": 2, ... }
  }
}
```
- 본인의 상세 일정/실패율은 노출하지 않음 (FR-SOC-03)

### GET /api/showcase/recommendations
- res: `{ data: [{ user_id, display_name, level, equipped_title }] }`  ← 추천 목록 (다른 사용자 최대 20)

## 8. Stats

### GET /api/stats/grass?days=365
- res: `{ data: { "YYYY-MM-DD": completed_count, ... } }`

### GET /api/stats/series?period=week|month|year
- res: `{ data: [{ date: "YYYY-MM-DD", success: N, fail: N }] }`

## 9. Notifications (스켈레톤)

### POST /api/notifications/subscribe
- body: WebPushSubscription JSON
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

### 일일 퀘스트 (FR-GAME-04)

- `ADD_PLAN` — 오늘 일정 2개 이상 추가 → 자동 완료 처리
- `COMPLETE_PLAN` — 오늘 일정 1개 이상 완료 → 자동 완료
- `VISIT_SHOWCASE` — 다른 사용자 쇼케이스 1회 이상 방문 → 자동 완료
- 각 보상: 50 points (일일 한도 적용)
- 매일 0시 reset

### 칭호 자동 부여 (FR-TITLE-01)

레벨 도달 시:
- Lv 3 → "첫걸음" (COMMON / #06D6A0)
- Lv 5 → "초보 모험가" (COMMON / #06D6A0)
- Lv 10 → "성실한 자" (RARE / #8B5CF6)
- Lv 20 → "달인" (EPIC / #FFD700)
- Lv 50 → "전설의 시간 마법사" (LEGENDARY / #FF6B6B)

연속 성공:
- 7일 연속 일정 완료 → "꾸준한 자" (RARE)

### 페널티 (FR-TITLE-03/04)

- 일정이 `OVERDUE` 상태로 전환되면 장착 칭호에 `negative_modifier`(예: "게으른") 부착
- 정상 일정 완료 1회 또는 "등급 하락 방어권" 사용으로 복구 가능
- 시스템이 임의 초기화 금지 (DC-07)

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
- OPENAI_API_KEY 없으면 character_type별 deterministic suffix 추가 (mock)

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
- `OPENAI_API_KEY` (선택, 없으면 mock)
- `LLM_MODEL=gpt-4o-mini`
- `DEV_MODE=true`
- `PORT=8080`
- `ALLOWED_ORIGINS=http://localhost:3000`

Frontend:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` (선택)
- `NEXT_PUBLIC_DEV_MODE=true`
