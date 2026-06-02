---
name: srs-version-bump
description: 새 UXUI 와이어프레임 PDF가 추가되면 SRS를 다음 minor 버전으로 정합화하고 README/CLAUDE.md/TODO.md를 동기화하는 정형 절차. 이전 SRS와 UXUI 자료는 동결 보존, SSoT(api_and_rules.md)·코드는 본 절차 범위 밖(별도 PR).
---

# SRS Version Bump

이 프로젝트의 권위 문서는 `docs/for_ai/planning/requirements_ieee830_v<X.Y>.md` 한 파일이고, 와이어프레임은 `docs/for_ai/planning/UXUI_<X.Y>.pdf`이다. 사용자가 새 UXUI PDF를 추가하고 "SRS v<X.Y>로 정합화" 같은 요청을 하면 본 스킬을 따른다.

## 언제 트리거

- `docs/for_ai/planning/` 에 `UXUI_<X.Y>.pdf` 같은 신규 와이어프레임 파일이 untracked로 등장
- 사용자가 "SRS를 다음 버전으로 갱신/정합화/업데이트", "v<X.Y>로 올려" 등 명시 요청
- 사용자 메시지에 와이어프레임 추가·이동(`Legacy/` 이동)이 함께 보일 때

## 절대 원칙 (CLAUDE.md 인용)

1. **이전 버전 SRS·와이어프레임은 동결 보존 — 절대 수정 금지.**
2. **SSoT(`docs/for_ai/spec/api_and_rules.md`)와 코드(`backend/`, `frontend/`, `migrations/`)는 본 PR 범위 밖.** 명칭 일원화·DB 컬럼 추가·라우트 변경 등 코드 동반 변경은 별도 PR (TODO.md에 후속 항목 등록).
3. **현재 권위 문서만 갱신.** 새 SRS는 직전 버전의 *사본*에서 시작한다.

## 단계별 절차

### 1. 진입 점검 (병렬)

```bash
git status --short
git fetch --all --prune
git rev-list --left-right --count <현재브랜치>...origin/<현재브랜치>
```

- 워킹트리에 새 UXUI PDF + 이전 자료 이동(`Legacy/`)이 있는지 확인
- 활성 개발 브랜치(보통 `feat/mvp-initial-impl`)와 원격 동기화 상태 확인
- 동기화가 깨졌으면 *먼저* pull/rebase (스킬과 무관한 작업)

### 2. 브랜치 생성

```bash
git checkout -b docs/srs-v<X.Y> origin/<active-dev-branch>
```

- 브랜치명: `docs/srs-v<X.Y>` 고정 (CLAUDE.md Conventional Commits 규칙)
- base는 **활성 개발 브랜치**(보통 `feat/mvp-initial-impl`). master 아님.

### 3. 자료 재배치 커밋 (커밋 1)

이전 와이어프레임 자료 + (있다면) 더 오래된 SRS를 `Legacy/`로 이동. 새 PDF를 정위치에 둔다.

```bash
git add docs/for_ai/planning/   # rename 자동 감지
git status --short              # R(rename) + A(add)로 깔끔하게 잡혀야 함
```

커밋 메시지 형식:
```
docs(planning): v<이전> 자료 Legacy 이동 + UXUI v<X.Y> PDF 추가

- UXUI.pdf → Legacy/UXUI_v<이전>.pdf (페이지 PNG 포함)
- 더 오래된 SRS는 이미 Legacy/ 라면 그대로 두기
- UXUI_<X.Y>.pdf 신규 (SRS v<X.Y> 작성 입력 자료)
```

> **주의**: `git add -A` / `git add .` 금지. `docs/for_ai/planning/` 디렉터리로 범위 한정.

### 4. PDF 분석 자료 생성

Read 도구는 시스템에 `pdftoppm`이 없으면 PDF를 직접 못 읽는다. 두 단계로 우회:

```bash
# 텍스트 (Claude가 읽을 본문)
pdftotext -enc UTF-8 -layout \
  docs/for_ai/planning/UXUI_<X.Y>.pdf \
  docs/for_ai/planning/UXUI_<X.Y>.txt

# 페이지 PNG (PyMuPDF, 120dpi)
python -c "
import fitz, os
pdf = fitz.open('docs/for_ai/planning/UXUI_<X.Y>.pdf')
out = 'docs/for_ai/planning/_uxui_pages_v<X.Y>'
os.makedirs(out, exist_ok=True)
for i, p in enumerate(pdf, 1):
    p.get_pixmap(dpi=120).save(f'{out}/uxui_{i:02d}.png')
print(f'Pages: {len(pdf)}')
"
```

이 두 산출물은 SRS와 함께 커밋한다(나중에 다시 분석할 때 PDF 재파싱 안 해도 됨).

### 5. 변경점 식별

추출한 텍스트와 PNG를 직전 와이어프레임과 비교해 **무엇이 바뀌었는지** 표로 정리한다. 흔한 변경 카테고리:

- **화면 통합/분리** — 두 화면이 하나로 합쳐졌거나 한 화면이 메인/설정으로 나뉜 경우
- **기능 명칭 변경** — UX 라벨이 바뀌면 SRS의 FR 명칭도 따라간다 (예: "소환" → "스킨 뽑기")
- **기능 책임 이동** — 같은 데이터를 다른 화면에서 편집하게 된 경우 (예: 상태 메시지 편집 위치 이동)
- **신설 필드/카테고리** — 와이어프레임에 새 입력·뽑기·카드가 생긴 경우
- **시드 예시 갱신** — 상점 아이템·가격·시드 데이터의 구체적 예시가 바뀐 경우

이 분석을 SRS 헤더 `**v<X.Y> 개정 요지**` 박스에 그대로 옮긴다.

### 6. SRS 작성 (커밋 2)

```bash
cp docs/for_ai/planning/requirements_ieee830_v<직전>.md \
   docs/for_ai/planning/requirements_ieee830_v<X.Y>.md
```

**직전 버전 파일은 절대 수정하지 않는다.** 새 파일에 대해서만 Edit. 정조준할 위치:

| 위치 | 변경 |
|---|---|
| 헤더 (line 1-18) | 문서 버전·날짜·개정 요지 박스 갱신. v<직전>·v1.2 동결 보존 명시 |
| 1.5 References | UXUI v<X.Y>·v<직전>·Legacy SRS 경로 갱신 |
| 3.1.1 User Interfaces | 명칭이 바뀐 UI-ID 갱신 + 화면 분리·신설 시 새 UI-ID 추가 |
| 3.1.1 말미 | **와이어프레임 ↔ UI-ID ↔ FR-ID 매핑 표** — 매 버전 새 와이어프레임 수에 맞춰 재작성 |
| 3.2.x FR 표 | 변경된 기능의 FR 행 갱신. 신설 FR은 다음 번호로 추가하고 `[v<X.Y>]` 태그 |
| Appendix C/D | 화면 매핑 라인·명칭 갱신 (값/공식은 그대로일 가능성이 높음) |

**`[v<X.Y>]` 태그**: 신설·갱신 항목 끝에 붙인다. 기존 `[v<이전>]` 태그는 그대로 둔다 (역사 표기).

커밋 메시지:
```
docs(srs): SRS v<X.Y> 신규 작성 — UXUI v<X.Y> 와이어프레임 정합화

v<직전> 사본 기반. 다음 N개 핵심 변경 반영:
- <변경 1, FR-ID·UI-ID 함께>
- <변경 2 ...>

함께 커밋: pdftotext UTF-8 추출본 + PyMuPDF 페이지 PNG (<n>매)
```

### 7. 부속 문서 동기화 (커밋 3)

- **CLAUDE.md**
  - Project Overview의 "SRS v<이전> 기준" → "SRS v<X.Y> 기준"
  - Source of Truth의 권위 문서 경로 v<이전> → v<X.Y>, 직전 버전을 동결 보존 목록에 추가
  - "절대 수정 금지" 규칙의 보존 대상 파일 목록 갱신 (이전 버전이 추가됨)
  - 와이어프레임 경로 갱신
  - **300줄 제한** 잊지 말 것
- **TODO.md**
  - 권위 문서·와이어프레임 경로 한 줄 갱신
  - A 섹션(UXUI 정합) — 새 PDF·페이지 수에 맞춰 표기 갱신
  - C 섹션 등에서 SRS 참조 일괄 갱신
  - **신규 섹션 추가**: "v<X.Y> 정합 — UXUI v<X.Y> 반영 (<날짜>)" — 코드 동반 변경이 필요한 후속 항목들을 체크박스로 등록 (이 PR이 *문서만* 갱신하기 때문에 후속 작업 추적용)
  - 공통 규칙의 동결 보존 목록 갱신
- **README.md**
  - "SRS v<이전> 기준" / "SRS v<이전>의 다음 범위" 같은 단순 라벨만 v<X.Y>로 치환
  - 아키텍처 다이어그램·기능 표 등은 코드 동반 변경 PR에서 처리
- **backend/tests/README.md**
  - 첫 줄 "요구사항서(SRS v<이전>...)"의 버전 라벨만 갱신

커밋 메시지:
```
docs: CLAUDE.md·TODO.md·README들을 SRS v<X.Y> 기준으로 갱신
```

### 8. push + PR

```bash
git push -u origin docs/srs-v<X.Y>
gh pr create \
  --base feat/mvp-initial-impl \
  --head docs/srs-v<X.Y> \
  --title "docs(srs): SRS v<X.Y> — UXUI v<X.Y> 와이어프레임 정합화" \
  --body "<.github/pull_request_template.md 전체 필드 채워서>"
```

PR 본문에 반드시 포함:
- **요구사항 ID** 섹션에 신설·갱신한 UI-ID / FR-ID 명시
- **유보 사항**: SSoT·코드는 별도 PR, TODO.md 새 섹션으로 추적한다는 문장
- **Test plan**: 자동 테스트 없음, 수동 검증으로 "이전 SRS 파일이 변경되지 않음" + "CLAUDE.md 300줄 제한" + "직전 버전 grep 잔재가 모두 의도된 참조"

## 절대 건드리지 않는 것

- `docs/for_ai/planning/requirements_ieee830_v<이전 모든 버전>.md`
- `docs/for_ai/planning/Legacy/**`
- `docs/for_ai/spec/api_and_rules.md` (SSoT — 코드와 짝)
- `backend/`, `frontend/`, `migrations/`, `docker-compose.yml`, `.env.example`, `.github/scripts/scan-secrets.mjs`

## 검증 체크리스트 (push 전)

```bash
# 1. 직전 버전 SRS 파일이 진짜로 변경 0인지
git diff --stat docs/for_ai/planning/requirements_ieee830_v<이전>.md
# (출력 없음이어야 함)

# 2. CLAUDE.md 줄 수
wc -l CLAUDE.md  # ≤ 300

# 3. 잔재 grep — 남은 것은 모두 "동결 보존" 참조여야 함
# (Bash 도구 안에서는 Grep 도구 사용)
```

`Grep` 도구로 패턴 `v1\.<이전>|SRS\s+v1` 같은 정규식을 *.md에 돌려, 남은 매치 한 줄 한 줄이 "Legacy 보존 안내"인지 점검한다. 본문 의미 라벨이 섞여 있으면 7단계로 돌아가 추가 갱신.

## 흔한 함정

- **PDF Read 실패** — `pdftoppm` 부재 시 Read 도구가 실패한다. 4단계 우회를 *바로* 쓴다.
- **bash가 `$bytes` 같은 PowerShell 변수를 잘라먹음** — `powershell.exe -NoProfile -Command '...'`에서 single-quote로 감싼다.
- **UTF-8 BOM** — `Set-Content -Encoding UTF8`은 BOM을 추가한다. `[System.IO.File]::WriteAllBytes(...)` + BOM 검출 후 제거로 정리.
- **Edit 도구 "File has not been read yet"** — 같은 세션에서 PowerShell·외부 도구로 파일을 만들면 Read를 한 번 호출해 줘야 Edit이 허용된다.
- **`gh pr merge` 금지** — CLAUDE.md 규칙. PR 머지는 사람이 GitHub 웹에서.

## 산출물 카탈로그

본 절차 1회 실행이 만드는 파일들:

```
docs/for_ai/planning/
├─ requirements_ieee830_v<X.Y>.md          # 새 SRS (직전 사본 + 패치)
├─ UXUI_<X.Y>.pdf                          # 사용자가 추가한 입력
├─ UXUI_<X.Y>.txt                          # pdftotext 산출
├─ _uxui_pages_v<X.Y>/uxui_NN.png          # PyMuPDF 산출
└─ Legacy/
   ├─ UXUI_v<이전>.pdf
   ├─ _uxui_pages_v<이전>/
   └─ requirements_ieee830_v<더 오래된>.md  # 이미 있다면 그대로

CLAUDE.md         # 권위 문서 포인터 갱신
TODO.md           # 경로 + 후속 작업 섹션 추가
README.md         # 버전 라벨
backend/tests/README.md  # 버전 라벨
```

## 본 스킬이 *하지 않는* 것

- API 엔드포인트 명칭 정합 (SSoT + 라우트 + 프론트 3곳 동시 갱신 → 별도 PR)
- DB 마이그레이션 (시드 갱신 등 코드 동반 변경 → 별도 PR)
- 프론트 화면 신설·라벨 변경 (TODO.md E 섹션으로 추적 → 별도 PR)
- 직전 SRS·UXUI의 본문 수정

이런 코드 동반 작업이 필요하다는 사실은 SRS v<X.Y>에 명시되고, 후속 PR 진입점은 TODO.md의 새 섹션이다.
