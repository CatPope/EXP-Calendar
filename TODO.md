# TODO

> 작업할 항목 목록. 세부 구현은 담당자가 직접 결정한다.
> 항목을 진행할 때는 본 파일을 함께 갱신한다 — 진행 중 `[~]`, 완료 `[x]`, 막히면 `[!]` + 사유 한 줄.
> 권위 문서는 `docs/for_ai/planning/requirements_ieee830_v1.3.md`, 와이어프레임은 `docs/for_ai/planning/UXUI.pdf` (페이지 PNG: `docs/for_ai/planning/_uxui_pages/`).

## A. UXUI 정합 — 프론트 전면 수정

> **⚠️ 전면 재설계 필요**: 기존 작업분은 폐기하고 와이어프레임(`docs/for_ai/planning/_uxui_pages/uxui_01~17.png`)과 SRS v1.3을 기준으로 처음부터 다시 설계한다. 이전 브랜치에서 일부 진행 기록(`[x]`)이 있었더라도 본 시점에서는 모두 미체크 상태로 간주하고 재작업한다.

- [ ] 와이어프레임과 SRS v1.3에 맞춰 `frontend/app/(app)/` 전 화면 점검·수정
- [ ] SRS v1.3에 있고 현재 없는 화면 신설 (퀘스트 / 소환·가챠 / 통계 / 통합 설정)
- [ ] `components/NavBar.tsx` 및 `app/(app)/layout.tsx` 네비게이션을 신설 화면까지 포함하도록 갱신
- [ ] 디자인 토큰(`tailwind.config.ts` + `app/globals.css`)만 사용 — 하드코딩 색상 금지

## B. 캐릭터 에셋 설치 (사용자 선택형)

> **에셋 출처는 자유**: itch.io, OpenGameArt.org, 자체 제작 등 개발자/사용자가 임의로 선택한다. 픽셀아트 스프라이트 시트 권장이지만 단일 이미지/PNG 시퀀스 등 어떤 형태도 가능. 어떤 에셋을 쓰든 **아래 체크리스트는 동일하게 적용**한다.

## C. 캐릭터 시스템 적용

- [ ] `frontend/lib/character.ts`를 **선택한 에셋 구조**(스프라이트 시트 / 단일 이미지 / 애니메이션 프레임 등)에 맞춰 추상화 — 에셋 교체 시 이 파일만 갱신하면 되도록 인터페이스 격리
- [ ] `frontend/components/CharacterAvatar.tsx`를 픽셀 보존 렌더로 교체 (`image-rendering: pixelated`)
- [ ] 캐릭터 카탈로그를 SRS v1.3 가챠 확률(Appendix D)과 정합되도록 등급 분배 (COMMON/RARE/EPIC/LEGENDARY)
- [ ] DB 스키마에 영향 있으면 신규 마이그레이션 추가 (기존 `001_init.sql` 수정 금지)
- [ ] 기존 캐릭터 에셋(예: Kenney) 사용처 일괄 정리 — 미사용 코드 잔재 없음

## 공통 규칙

- 작업 시작 전 `CLAUDE.md` 정독.
- SRS v1.2(`requirements_ieee830.md`)는 절대 수정 금지. v1.3 사본만 갱신, 권위 변경 필요 시 사용자에게 먼저 확인.
- 세부 결정은 담당자가 내리되, 본 TODO와 어긋나는 결정은 본 파일을 함께 수정해 기록한다.
- PR 본문에 어떤 항목을 처리했는지 본 파일 체크박스 기준으로 보고한다.
