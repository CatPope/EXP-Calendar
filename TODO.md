# TODO

> 작업할 항목 목록. 세부 구현은 담당자가 직접 결정한다.
> 항목을 진행할 때는 본 파일을 함께 갱신한다 — 진행 중 `[~]`, 완료 `[x]`, 막히면 `[!]` + 사유 한 줄.
> 권위 문서는 `docs/for_ai/planning/requirements_ieee830_v1.4.md`, 와이어프레임은 `docs/for_ai/planning/UXUI_1.4.pdf` (페이지 PNG: `docs/for_ai/planning/_uxui_pages_v1.4/`). 직전 v1.3 SRS·와이어프레임은 동결 보존(`requirements_ieee830_v1.3.md`, `Legacy/UXUI_v1.3.pdf`).

## A. UXUI 정합 — 프론트 전면 수정 (v1.4 기준)

> **⚠️ 전면 재설계 필요**: 기존 작업분은 폐기하고 와이어프레임 v1.4(`docs/for_ai/planning/_uxui_pages_v1.4/uxui_01~19.png`)과 SRS v1.4를 기준으로 처음부터 다시 설계한다. 이전 브랜치에서 일부 진행 기록(`[x]`)이 있었더라도 본 시점에서는 모두 미체크 상태로 간주하고 재작업한다.

- [ ] 와이어프레임 v1.4와 SRS v1.4에 맞춰 `frontend/app/(app)/` 전 화면 점검·수정
- [ ] SRS v1.4에 있고 현재 없는 화면 신설 (퀘스트 / 스킨 뽑기 / 통계 / 통합 설정 / **페르소나·칭호 메인·설정 2화면**)
- [ ] `components/NavBar.tsx` 및 `app/(app)/layout.tsx` 네비게이션을 신설 화면까지 포함하도록 갱신
- [ ] 디자인 토큰(`tailwind.config.ts` + `app/globals.css`)만 사용 — 하드코딩 색상 금지

## B. 캐릭터 에셋 설치 (사용자 선택형)

> **에셋 출처는 자유**: itch.io, OpenGameArt.org, 자체 제작 등 개발자/사용자가 임의로 선택한다. 픽셀아트 스프라이트 시트 권장이지만 단일 이미지/PNG 시퀀스 등 어떤 형태도 가능. 어떤 에셋을 쓰든 **아래 체크리스트는 동일하게 적용**한다.

## C. 캐릭터 시스템 적용

- [ ] `frontend/lib/character.ts`를 **선택한 에셋 구조**(스프라이트 시트 / 단일 이미지 / 애니메이션 프레임 등)에 맞춰 추상화 — 에셋 교체 시 이 파일만 갱신하면 되도록 인터페이스 격리
- [ ] `frontend/components/CharacterAvatar.tsx`를 픽셀 보존 렌더로 교체 (`image-rendering: pixelated`)
- [ ] 스킨 카탈로그를 SRS v1.4 스킨 뽑기 확률(Appendix D)과 정합되도록 등급 분배 (COMMON/RARE/EPIC/LEGENDARY)
- [ ] DB 스키마에 영향 있으면 신규 마이그레이션 추가 (기존 `001_init.sql` 수정 금지)
- [ ] 기존 캐릭터 에셋(예: Kenney) 사용처 일괄 정리 — 미사용 코드 잔재 없음

## D. v1.3 기능 정합 — 백엔드/프론트 풀스택 (2026-06-02 구현)

> 프론트 대비 미구현 기능 전부 구현. SSoT(`api_and_rules.md`)·engine·마이그레이션 동기화 완료. 컨테이너 빌드/`go test`/e2e 검증됨.

- [x] **규칙 정합**: 퀘스트 차등 보상(ADD_PLAN 20·COMPLETE_PLAN 30·VISIT_SHOWCASE 15) + 3종 보너스 +50 + 7일 스트릭 ×2 (`engine.go`, `quests.go`)
- [x] **칭호 8종**(SRS Appendix C) 정합: 레벨 기반 폐기 → `condition` 파싱(STREAK/COMPLETE_COUNT/MORNING/HIGH/OVERDUE/LEGENDARY_CHAR) 기반 부여, 일정 완료 후 평가 (`migrations/005`, `engine.go`, `schedules.go`, `stats.go`)
- [x] **페널티**(FR-TITLE-03/04): worker가 OVERDUE 스윕 → 장착 칭호에 "게으른" 부착·`overdue_count++`; 정상 완료 또는 DEFENSE 구매로 복구 (`worker/`, `schedules.go`, `shop.go`)
- [x] **가챠·소환 풀스택**(Part K): `characters`/`user_characters`/`summon_log` + 확률(60/28/9/3, 픽업 2배)·천장90·10연차 RARE+확정·중복 환급·단일 장착·소환권 (`summon.go`, `characters.go`, 프론트 `summon/`)
- [x] **알림**(FR-NOTI-02): worker 리마인더 스캔(사용자 `reminder_minutes` 전) + 발송 추상화(`LogNotifier`). 실제 Web Push 발송은 VAPID 키 + push 라이브러리 연동 후속 `[!]`
- [x] **통합 설정**(Part L): `user_settings` + GET/PATCH `/settings`, JSON 내보내기, 계정 초기화 (`settings.go`, 프론트 `settings/`)
- [x] **통계·등급**(FR-STAT-03/05): `/stats/summary`(rating D~S·현재/최장 스트릭), 프론트 `stats/`
- [x] **프론트 화면 4종**(UI-08/09/10/11): `quests`/`summon`/`stats`/`settings` + `api.ts`·`types.ts`·네비 갱신 (next build 통과)
- [!] 후속: 실제 Web Push 발송(VAPID), GCal 양방향(V2), 다국어/다중테마(V2, UI만 노출)

## E. v1.4 정합 — UXUI v1.4 반영 (2026-06-03)

> v1.3 → v1.4 변경분(`requirements_ieee830_v1.4.md`)에 맞춰 SSoT·코드·프론트를 동기화한다.

- [ ] **페르소나·칭호 통합 화면 2면 신설** (UI-13/14, 와프 05·06): 메인(열람) + 설정(편집). 기존 분리된 칭호/페르소나 화면은 마이그레이션 또는 폐기
- [ ] **"소환(가챠)" → "스킨 뽑기" 명칭 일원화** (FR-SUMMON, UI-09, 와프 07): 프론트 라우트(`summon/` 유지 또는 `skin-draw/`)·라벨·아이콘 일괄. API 경로 변경은 호환 유지 검토 후 결정
- [ ] **상태 메시지(대사) 편집** (FR-STAT-06, 와프 09): 통계·등급 화면에 편집 UI + `users.character_quote` 컬럼 추가 마이그레이션
- [ ] **상점 시드 정합** (FR-SHOP-03, 와프 08): 픽셀 모자(120P) · 네온 오라(260P) · 배경:우주(400P) 시드 갱신 마이그레이션 (기존 시드는 보존)
- [ ] **3.1.1절 와이어프레임 ↔ UI-ID ↔ FR-ID 매핑 표** 기준으로 인수 테스트 시나리오 보강
- [ ] SSoT(`api_and_rules.md`) 용어 정합: `소환` 표기를 `스킨 뽑기`로 일괄 갱신 (API 경로 호환 정책 결정 후)

## 공통 규칙

- 작업 시작 전 `CLAUDE.md` 정독.
- SRS v1.2(`Legacy/requirements_ieee830_v1.2.md`)·v1.3(`requirements_ieee830_v1.3.md`)은 동결 보존, **절대 수정 금지**. 현재 권위 문서는 v1.4. 권위 변경 필요 시 사용자에게 먼저 확인.
- 세부 결정은 담당자가 내리되, 본 TODO와 어긋나는 결정은 본 파일을 함께 수정해 기록한다.
- PR 본문에 어떤 항목을 처리했는지 본 파일 체크박스 기준으로 보고한다.
