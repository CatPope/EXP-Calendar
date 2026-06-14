# PR 본문 초안 — 휴면 / 복귀 로직 (Part I)

> `.github/pull_request_template.md` 양식을 그대로 채워 둔 사본. `gh pr create --body "$(cat ...)"` 로 그대로 사용 가능.

## Part

Part I — 휴면 계정 정책

## 요구사항 ID

FR-DORM-01, FR-DORM-02, FR-DORM-03, FR-DORM-04, FR-DORM-05, FR-DORM-06, FR-NOTI-03

## 변경 유형 (Change Type)

- [x] 기능 (Feature)
- [ ] 버그 수정 (Bug Fix)
- [ ] 리팩토링 (Refactor)
- [x] 문서 (Docs)
- [x] 테스트 (Test)
- [ ] 인프라 (Infra)
- [ ] 기타 (Other)

## Summary

- **14일 미접속 자동 휴면 (FR-DORM-01)**: 워커가 시간 단위 throttle 로 `users.last_active_at < now() - 14d` 인 `ACTIVE` 계정을 `DORMANT` 로 전환하고 `dormant_since` 를 stamp.
- **13일차 경고 푸시 (FR-DORM-06 / FR-NOTI-03)**: `notification_prefs.dormancy_warning` 가 켜진 사용자에게 하루 1회 Web Push 발송.
- **복귀 보너스 패키지 (FR-DORM-03/04/05)**: `DORMANT` 로그인 시 단일 트랜잭션에서 `ACTIVE` 복귀 + **2,800P**(일일 한도 우회) + **7일 EXP 1.5× 버프** + **최초 복귀에 한해 방어권 3장** + `needs_reonboarding=true`. 로그인 응답에 `return_grant` 동봉.
- **성향 재설문 강제 (FR-DORM-02)**: 프론트 (`/login`, `(app)/layout`) 가 `needs_reonboarding` 또는 `return_grant` 를 감지하면 `/onboarding` 으로 라우팅. `POST /api/me/onboarding` 가 호출되면 플래그 해제.
- **EXP 버프 적용**: `game.CalculateRewardWithBuff` 가 `IsReturnBuffActive(return_buff_until, now)` 일 때 EXP 한정 ×1.5. 포인트는 미가산(일일 한도 공정성).
- **활동 heartbeat**: `issueTokens` 와 `GET /api/me` 가 `last_active_at = now()` 갱신.
- **HUD 표시**: 버프 활성 중에는 EXP 라벨 옆에 `1.5×` 뱃지.
- **문서/스펙**: SSoT (`api_and_rules.md`) 휴면/복귀 절 추가, SRS v1.4 `3.2.3` 구현 상태 표 추가, README Part I 상태 + 데모 SQL 추가.

## 영향 범위 (Impact)

- [x] Frontend (Next.js)
- [x] Backend (Go/Gin)
- [x] Database (PostgreSQL)
- [ ] Infra (Docker/Nginx)

### 주요 변경 파일

| 분류 | 경로 | 비고 |
|------|------|------|
| Migration | `backend/migrations/013_dormancy.sql` | 신규. users 6개 컬럼 + sweep 부분 인덱스 |
| Backend | `backend/internal/models/models.go` | `User` 휴면 필드 + `ReturnGrant` |
| Backend | `backend/internal/repo/users.go` | `userSelect` / `scanUser` 확장 |
| Backend | `backend/internal/repo/dormancy.go` | 신규. 활동/스윕/경고/복귀/재설문 해제 |
| Backend | `backend/internal/game/engine.go` | 상수 + `IsReturnBuffActive` + `CalculateRewardWithBuff` |
| Backend | `backend/internal/handlers/auth.go` | `DORMANT` 감지 + `ProcessReturn` + `return_grant` |
| Backend | `backend/internal/handlers/me.go` | `/me` 응답 필드 + heartbeat + `Onboarding` 해제 |
| Backend | `backend/internal/handlers/schedules.go` | `CalculateRewardWithBuff` 적용 |
| Backend | `backend/internal/worker/worker.go` | `processDormancy` (시간 throttle) |
| Frontend | `frontend/lib/types.ts` | `User` 필드 + `ReturnGrant` + `AuthResponse.return_grant` |
| Frontend | `frontend/app/login/page.tsx` | `flashReturnGrant` 토스트 + 재설문 라우팅 |
| Frontend | `frontend/app/(app)/layout.tsx` | `needs_reonboarding` 가드 |
| Frontend | `frontend/components/HUD.tsx` | EXP 1.5× 뱃지 |
| Docs | `docs/for_ai/spec/api_and_rules.md` | 휴면/복귀 절 + 로그인 응답 + `/me` 필드 |
| Docs | `docs/for_ai/planning/requirements_ieee830_v1.4.md` | 3.2.3 구현 상태 표 |
| Docs | `README.md` | Part I 상태 + 데모 SQL |
| TODO | `TODO.md` | FR-DORM 완료 기록 |

## Test plan

- [x] 단위 테스트 통과 — `backend/internal/game/engine_test.go` 에 `TestCalculateRewardWithBuff_ReturnBuffBoostsExpOnly`, `TestIsReturnBuffActive` 추가.
- [ ] 통합 테스트 통과 — Worker → DB 흐름은 컨테이너 기동 후 수동으로 검증 (아래 수동 시나리오).
- [ ] 수동 테스트 완료 — README "테스트 시나리오 #7" 의 휴면/복귀 흐름 (DB 14일 backdate → 워커 휴면 전환 → 재로그인 토스트 → 성향 재설문 → HUD 1.5× 뱃지 → 일정 완료 시 EXP 1.5× 검증).

### 수동 검증 절차

```powershell
# 1) 컨테이너 + DB 기동, 마이그레이션 013 자동 적용 확인
docker compose up -d --build
docker compose logs backend | findstr "013_dormancy"

# 2) dev@example.com 을 즉시 DORMANT 로 강제 (워커 tick 대기 단축)
docker compose exec db psql -U exp -d expcalendar -c `
  "UPDATE users SET account_status='DORMANT', dormant_since=now() - interval '1 day', last_active_at=now() - interval '15 days' WHERE email='dev@example.com';"

# 3) 프론트에서 dev-login (email=dev@example.com, password=1234)
#    → 토스트: "돌아오신 걸 환영해요! +2800P · EXP 7일간 1.5× · 방어권 3장"
#    → /onboarding 으로 자동 이동
#    → 성향 선택 후 calendar 로 진입, HUD EXP 옆 [1.5×] 뱃지 표시

# 4) 일정 1개 완료 → 보상 토스트의 exp_gained 가 평소 대비 1.5배인지 확인.

# 5) 7일 후 버프 만료 확인은 return_buff_until 을 과거로 돌려 verify
docker compose exec db psql -U exp -d expcalendar -c `
  "UPDATE users SET return_buff_until = now() - interval '1 hour' WHERE email='dev@example.com';"
#    → /me 재호출 시 return_buff_until=null, HUD 뱃지 사라짐.
```

## 체크리스트 (Checklist)

- [x] Conventional Commits 형식 준수 — `feat(part-i): 휴면/복귀 정책 (FR-DORM-01~06)` 권장.
- [x] 시크릿/API 키 미포함 확인 — 코드/문서 모두 해당 사항 없음.
- [x] 환경변수 추가 시 `.env.example` 반영 — 신규 환경변수 없음 (모두 DB·코드 상수).

## 담당

- [x] 개발 (신강민)
- [ ] 인프라 (정다우)
