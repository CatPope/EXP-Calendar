# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- **팀 구성**: 정다우(인프라), 신강민(개발), 백인서(발표)
- **개발 방식**: Claude Code subagent 병렬 개발 (Part A~H)

## Project Overview

**EXP Calendar** — 게이미피케이션 기반 일정 관리 PWA. Google Calendar 연동 + EXP/포인트/칭호 보상 + LLM 페르소나 + 소셜 쇼케이스. 개발 기한 2주(1주 개발 + 1주 테스트), SRS v1.2 기준 Part A~H 필수, I~J 권장.

## Tech Stack

| 계층 | 사용 |
|------|------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + next-pwa |
| Backend | Go 1.22 + Gin + pgx/v5 + golang-jwt/v5 |
| DB | PostgreSQL 15 (pgvector pg15 이미지) |
| Infra | Docker Compose (db / backend / frontend / 선택 nginx) |
| 외부 | Google OAuth 2.0 (idtoken), Google Gemini (generateContent), FCM/Web Push |

## Source of Truth

- **요구사항(권위 문서)**: [docs/for_ai/planning/requirements_ieee830.md](docs/for_ai/planning/requirements_ieee830.md) — SRS v1.2 (IEEE 830)
- **API 계약 & 게임 규칙(SSoT)**: [docs/for_ai/spec/api_and_rules.md](docs/for_ai/spec/api_and_rules.md) — 모든 엔드포인트 스키마, 응답 envelope `{data}`/`{error}`, EXP/Points 공식, 일일 한도, 칭호 부여 조건, LLM 프롬프트 템플릿. **backend/frontend 변경 시 이 문서와 코드를 동시 갱신**한다.

## 자주 쓰는 명령

```powershell
# 전체 기동 (DB + backend + frontend)
Copy-Item .env.example .env       # 최초 1회
docker compose up -d --build
docker compose logs -f backend
docker compose logs -f frontend

# 정지 / 초기화
docker compose down               # 데이터 유지
docker compose down -v            # DB 볼륨 삭제

# nginx 포함 프로필
docker compose --profile prod up -d --build

# DB 접속
docker compose exec db psql -U exp -d expcalendar

# 호스트에서 개별 실행
docker compose up -d db           # DB만
cd backend  ; go run ./cmd/server # backend (DATABASE_URL을 localhost로)
cd frontend ; npm install ; npm run dev

# 백엔드 테스트 (game 엔진 단위 테스트만 존재)
cd backend ; go test ./internal/game/...

# 프론트엔드 린트 / 타입체크 / 빌드
cd frontend ; npm run lint
cd frontend ; npx tsc --noEmit
cd frontend ; npm run build
```

기본 포트: 프론트 `3000`, 백엔드 `8080`, DB `5432`. health = `GET /health`.

## 아키텍처 — 큰 그림

### Backend (`backend/`)

요청은 **router → middleware(JWT) → handler → game/llm + repo(pgx) → DB** 순으로 흐른다. 각 레이어의 역할 경계가 코드 변경 시 가장 중요하다.

- `cmd/server/main.go` — config 로드 → pgxpool 연결 → 부팅 시 `migrations/*.sql` 알파벳 순 자동 실행(idempotent) → `server.NewRouter` → graceful shutdown
- `internal/server/router.go` — **모든 라우트의 단일 정의 지점**. public(`/auth/google|dev-login|refresh`) / authed(나머지 + `/auth/logout`)로 그룹 분리
- `internal/handlers/` — 도메인별 파일(`auth.go`, `me.go`, `schedules.go`, `quests.go`, `shop.go`, `titles.go`, `persona.go`, `showcase.go`, `stats.go`, `notifications.go`). 응답 envelope 헬퍼는 `common.go`, KST(Asia/Seoul) 일자 유틸은 `time.go`
- `internal/game/engine.go` — **게임 규칙의 단일 진실**: `CalculateReward`, `LevelFromExp`(`1 + floor(sqrt(total_exp/100))`), `ExpToNextLevel`, `ApplyDailyCap`, `TitlesUnlockedBetween`. 규칙 변경은 반드시 이 파일에서. SSoT 문서와 동기화 필수
- `internal/repo/` — 도메인별 DAO(`users/schedules/titles/quests/shop/rewards/refresh/push`). 핸들러는 SQL 직접 작성하지 말고 repo를 통한다
- `internal/llm/llm.go` — Google Gemini generateContent 직접 호출 + `GEMINI_API_KEY` 없을 때 캐릭터별 deterministic mock 폴백 + 프롬프트 인젝션 sanitize
- `internal/auth/` — `jwt.go`(HS256 access + opaque refresh 토큰 발급/검증), `google.go`(`idtoken.Validate` 우선, audience 미설정 시 `tokeninfo` HTTP fallback)
- `internal/middleware/auth.go` — `Authorization: Bearer` 파싱 후 `userID`를 gin context에 주입
- `migrations/001_init.sql` + `002_seed.sql` — ERD는 SRS 3.4.1 기준. 시드: 칭호 6종 + 상점 5종. **컬럼명 주의**: SRS의 `last_points_reset_at` ↔ 코드/DB의 `daily_points_earned_date`(같은 의미)

**트랜잭션 경계**가 명확해야 하는 곳:
1. `POST /api/schedules/:id/complete` — status 변경 + reward_log insert + user 갱신 + 레벨업/칭호 검사 + COMPLETE_PLAN 퀘스트 자동 완료를 한 트랜잭션
2. `POST /api/shop/purchase` — 잔액 검증 + 차감 + purchases insert + (PERSONA 카테고리는 `users.persona_character_type`까지 갱신)

### Frontend (`frontend/`)

App Router 구조에서 **라우트 그룹 `(app)/`이 인증 경계**다. `(app)/layout.tsx`가 마운트되면서 토큰 검사 → `/api/me` 호출 → 실패 시 `/login` 리다이렉트. 모든 보호 페이지는 이 그룹 안에 둔다.

- `app/login/page.tsx` — Google GSI 동적 로드 + dev-login 폼. 토큰 없는 사용자의 진입점
- `app/(app)/layout.tsx` — 인증 가드 + 상단 HUD + 사이드바/햄버거. **신규 보호 페이지는 반드시 `(app)/` 아래**
- `app/(app)/{calendar,shop,titles,persona,showcase}/page.tsx` — 도메인 화면
- `lib/api.ts` — **모든 API 호출의 진입점**. `apiFetch<T>`는 (1) localStorage의 access 토큰 자동 첨부 (2) 401 시 `/api/auth/refresh` 1회 시도 후 재요청 (3) `{data}`/`{error}` 언래핑 후 `ApiError` throw. 신규 엔드포인트는 `Api.*` 헬퍼에 추가
- `lib/store.ts` — Zustand 글로벌 상태: `user`, `toasts`, `reward`. 로그인 후 `setUser(me)`로 채움
- `lib/auth.ts` — localStorage 토큰 입출력(SSR 안전). 외부에서 직접 localStorage 접근 금지
- `components/calendar/` — 자체 구현 월/주/일 그리드 + HTML5 드래그앤드롭(due_date 변경 PATCH). **외부 캘린더 라이브러리 사용 금지**
- `components/HUD.tsx`, `RewardToast.tsx`, `GrassGraph.tsx`, `TitleBadge.tsx` — 게임 UI 요소
- 다크 테마는 `app/globals.css`의 CSS 변수 + `tailwind.config.ts`의 컬러 매핑으로 일원화. 새 색상이 필요하면 `lib/theme.ts`와 함께 갱신

### Infra (루트)

- `docker-compose.yml` — `DATABASE_URL`(컨테이너 내부 host=`db`)과 `NEXT_PUBLIC_API_BASE_URL`(브라우저 host=`localhost`)을 compose의 `environment:`에서 **명시적으로 덮어씀**. `.env`에 같은 키가 있어도 무시됨
- `nginx/nginx.conf` — `profile: prod`로만 기동. `:80`에서 `/api/`→backend, 나머지→frontend

## Design Decisions (변경 금지)

- 자체 캘린더 엔진 없음 — Google Calendar API 단방향 읽기. 양방향 동기화는 V2 후보
- 네이티브 앱 없음 — PWA로 대체
- 자체 AI 모델 없음 — 외부 LLM API. 키 없으면 mock 폴백(개발 편의)
- PG사 결제·연말 리포트는 현재 범위 외
- 인앱 상점은 무료 재화(포인트)만
- 페널티 리셋 불가 (DC-07): 시스템이 임의 초기화 금지, 정상 일정 완료 또는 "등급 하락 방어권" 사용으로만 복구
- 병렬 개발: Part A(인증) 완료 후 B·D·E·F·H 동시 착수 (SRS 1.4절)

## 개발 규칙

- **요구사항서(`docs/for_ai/planning/requirements_ieee830.md`)는 절대 수정 금지**. SRS는 권위 문서이며 인간 의사결정 산출물이다. 코드가 SRS와 어긋날 때는 코드를 고치고, SRS 변경이 필요해 보이면 사용자에게 먼저 확인. 임의 갱신·정정·문구 다듬기 모두 금지
- 기능 구현 시 **항상 subagent(Agent 도구)를 활용**하여 병렬로 작업한다. 독립적인 모듈(예: backend vs frontend)은 동시 spawn
- 게임 규칙/공식 변경 시 `docs/for_ai/spec/api_and_rules.md`와 `backend/internal/game/engine.go`를 **함께** 갱신. 둘 중 하나만 바뀌면 SSoT가 깨진다
- API 엔드포인트 추가/변경 시 → SSoT 문서 + `backend/internal/server/router.go` + `frontend/lib/api.ts`의 `Api.*` 3곳 동시 갱신
- DB 스키마 변경 시 → 새 migration 파일(예: `003_*.sql`) 추가. **기존 `001_init.sql` 수정 금지**(부팅 시 idempotent 적용이라 기존 사용자 환경 불일치)
- 핸들러는 SQL 직접 쓰지 말고 `internal/repo/`를 거친다
- 보호 라우트로 만들 페이지는 반드시 `frontend/app/(app)/` 그룹 아래에 둔다 (인증 가드가 그룹 레이아웃에 있음)

## Git Convention

### 커밋 메시지 (Conventional Commits)

`<type>(<scope>): <subject>` — subject는 50자 이내

- **type**: `feat|fix|docs|refactor|chore|test|style|perf|ci|build|revert`
- **scope**: 소문자 kebab-case (예: `auth`, `part-b`, `game-engine`)
- 예시: `feat(auth): Google OAuth 로그인 구현`, `fix(part-b): EXP 계산 오류 수정`

### 브랜치 네이밍

`<type>/<part>-<설명>` — 예: `feat/part-a-auth`, `fix/part-b-exp-calc`

### PR 규칙

- push 후 `gh pr list --head <브랜치명>`으로 기존 PR 확인 → 있으면 자동 반영, 없으면 `gh pr create`로 생성
- PR 생성 시 `.github/pull_request_template.md` 템플릿의 **모든 필드**를 채운다
- 필수 섹션: `## Part`, `## 요구사항 ID`, `## Summary`, `## Test plan`
- `gh pr create` 사용 시 `--body`에 템플릿 전체 구조를 포함한다 (빈 `--body`로 템플릿 덮어쓰기 금지)
- CI 검증 항목: Conventional Commits 형식, **CLAUDE.md 300줄 제한**, JS 구문 검사, 시크릿 스캔
- **금지**: `gh pr merge` — PR 병합은 반드시 GitHub 웹에서 사용자가 직접 수행

## UI Theme

다크 모드 게임 UI. 배경 `#0D1117`, 표면 `#161B22`, 강조 `#8B5CF6`(퍼플), 성공 `#06D6A0`(시안), 보상 `#FFD700`(골드), 경고 `#FF6B6B`(레드). CSS 변수와 `tailwind.config.ts`의 컬러 매핑을 통해 일원화되어 있다.
