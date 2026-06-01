# TODO

> 작업할 항목 목록. 세부 구현은 담당자가 직접 결정한다.
> 항목을 진행할 때는 본 파일을 함께 갱신한다 — 진행 중 `[~]`, 완료 `[x]`, 막히면 `[!]` + 사유 한 줄.
> 권위 문서는 `docs/for_ai/planning/requirements_ieee830_v1.3.md`, 와이어프레임은 `docs/for_ai/planning/UXUI.pdf` (페이지 PNG: `docs/for_ai/planning/_uxui_pages/`).

## A. UXUI 정합 — 프론트 전면 수정

- [x] 와이어프레임과 SRS v1.3에 맞춰 `frontend/app/(app)/` 전 화면 점검·수정 — 캘린더(월/주/일)·칭호·상점·쇼케이스·페르소나 정렬 (uxui_01~05,08,11~14)
- [x] SRS v1.3에 있고 현재 없는 화면 신설 (퀘스트 / 소환·가챠 / 통계 / 통합 설정) — `/quests` `/summon` `/stats` `/settings` 신설 (uxui_04,06~07,09~10,15~17). 소환은 백엔드 가챠 엔드포인트 부재로 프론트 mock(`lib/summon.ts` + localStorage)
- [x] `components/NavBar.tsx` 네비게이션을 신설 화면까지 포함하도록 갱신 — `(app)/layout.tsx` 사이드바 NAV도 동일 갱신, 설정은 모달→페이지 링크로 전환
- [x] 디자인 토큰(`tailwind.config.ts` + `app/globals.css`)만 사용 — 하드코딩 색상 금지. 등급 색은 `lib/game.ts`의 `GRADE_*`/`gradeBadgeClass` 단일 소스로 통일. 예외 1건: 설정 화면 컬러테마 미리보기 스와치 점만 인라인 hex(팔레트 리터럴 프리뷰)
- [x] 빌드 검증 완료 — `node:20` 컨테이너에서 전체 의존성 설치 후 `npx tsc --noEmit`(에러 0) + `npx next lint --max-warnings=0`(경고/에러 0) 통과. (스택 실제값: Next 15.5 + React 19 + TS 5.6)

## B. SuperRetroWorld 캐릭터 에셋 설치

- [ ] `frontend/public/SuperRetroWorld_CharacterPack_Full.zip` 존재 확인 (없으면 itch.io에서 받아 같은 경로에 둠)
- [ ] 라이선스 준수: zip·압축 해제본을 **공개 리포에 커밋 금지** (gitignore 처리)
- [ ] 로컬에서 zip을 압축 해제하는 설치 스크립트·문서 마련 (개발자가 풀 받은 뒤 한 줄 명령으로 설치 가능해야 함)
- [ ] AI 학습 데이터로 사용하지 않음 명시(README 또는 설정 화면) + 작가 크레딧 표기
- [ ] AI 크롤러 차단(robots.txt) 권장

## C. 캐릭터 에셋 교체

- [ ] `frontend/lib/character.ts`를 SuperRetroWorld 스프라이트 시트 모델로 재작성
- [ ] `frontend/components/CharacterAvatar.tsx`를 픽셀 보존 렌더로 교체 (`image-rendering: pixelated`)
- [ ] 캐릭터 카탈로그를 SRS v1.3 가챠 확률(Appendix D)과 정합되도록 등급 분배
- [ ] DB 스키마에 영향 있으면 신규 마이그레이션 추가 (기존 `001_init.sql` 수정 금지)
- [ ] 기존 Kenney 사용처 일괄 정리 — 미사용 코드 잔재 없음

## 공통 규칙

- 작업 시작 전 `CLAUDE.md` 정독.
- SRS v1.2(`requirements_ieee830.md`)는 절대 수정 금지. v1.3 사본만 갱신, 권위 변경 필요 시 사용자에게 먼저 확인.
- 세부 결정은 담당자가 내리되, 본 TODO와 어긋나는 결정은 본 파일을 함께 수정해 기록한다.
- PR 본문에 어떤 항목을 처리했는지 본 파일 체크박스 기준으로 보고한다.
