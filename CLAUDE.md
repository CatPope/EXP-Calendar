# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


- **팀 구성**: 정다우(인프라), 신강민(개발), 백인서(발표)
- **개발 방식**: Claude Code subagent 병렬 개발 (Part A~H)

## Project Overview

**EXP Calendar** — 게이미피케이션 기반 일정 관리 시스템. Google Calendar 연동 + EXP/포인트/칭호 보상 + LLM 페르소나 + 소셜 쇼케이스를 제공하는 PWA.

## Tech Stack

- **Frontend**: Next.js (React), PWA
- **Backend**: Go (Gin/Echo)
- **Database**: PostgreSQL (pgvector)
- **Infra**: 온프레미스 (Docker Compose, Nginx, Grafana/Prometheus), GitHub Actions
- **External**: Google OAuth 2.0, Google Calendar API, LLM API (OpenAI), FCM/Web Push

## Project Status

현재 **기획/설계 단계**. 코드 구현 전이며, `docs/for_ai/planning/` 하위에 요구사항 문서가 존재한다.
개발 기한: **2주 (1주 개발 + 1주 테스트)**. SRS v1.2 기준 Part A~H 필수, Part I~J 권장.

## Key Documents

| 문서 | 경로 | 설명 |
|------|------|------|
| SRS (IEEE 830) | `docs/for_ai/planning/requirements_ieee830.md` | 정식 요구사항 명세서 (권위 문서) |

## Design Decisions

- 자체 캘린더 엔진 없음 — Google Calendar API 연동으로 대체
- 네이티브 앱 없음 — PWA로 대체
- 자체 AI 모델 없음 — 외부 LLM API 호출
- PG사 결제·양방향 동기화·연말 리포트는 현재 범위 외 (V2 후보)
- 인앱 상점은 무료 재화만 운영
- 병렬 개발: Part A(인증) 완료 후 B·D·E·F·H 동시 착수 (SRS 1.4절 참조)

## 개발 규칙

- 기능 구현 시 **항상 subagent(Agent 도구)를 활용**하여 병렬로 작업한다
- 독립적인 파일/모듈은 여러 subagent를 동시에 spawning하여 개발 속도를 높인다
- 예: frontend와 backend를 각각 별도 subagent로 동시 구현

## Git Convention

### 커밋 메시지 (Conventional Commits)

`<type>(<scope>): <subject>` — subject는 50자 이내

- **type**: `feat|fix|docs|refactor|chore|test|style|perf|ci|build|revert`
- **scope**: 소문자 kebab-case (예: `auth`, `part-b`, `game-engine`)
- 예시: `feat(auth): Google OAuth 로그인 구현`, `fix(part-b): EXP 계산 오류 수정`

### 브랜치 네이밍

`<type>/<part>-<설명>` — 예: `feat/part-a-auth`, `fix/part-b-exp-calc`

### PR 규칙

- PR 생성 시 `.github/pull_request_template.md` 템플릿의 **모든 필드**를 채운다
- 필수 섹션: `## Part`, `## 요구사항 ID`, `## Summary`, `## Test plan`
- `gh pr create` 사용 시 `--body`에 템플릿 전체 구조를 포함한다 (빈 `--body`로 템플릿 덮어쓰기 금지)
- CI 검증 항목: Conventional Commits 형식, CLAUDE.md 300줄 제한, JS 구문 검사, 시크릿 스캔

## UI Theme

다크 모드 기반 게임 UI. 배경 `#0D1117`, 강조 `#8B5CF6`(퍼플), 성공 `#06D6A0`(시안), 보상 `#FFD700`(골드), 경고 `#FF6B6B`(레드).
