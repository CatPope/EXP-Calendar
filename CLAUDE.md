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

현재 **기획/설계 단계**. 코드 구현 전이며, `docs/planning/` 하위에 요구사항 문서가 존재한다.
개발 기한: **2주 (1주 개발 + 1주 테스트)**. SRS v1.2 기준 Part A~H 필수, Part I~J 권장.

## Key Documents

| 문서 | 경로 | 설명 |
|------|------|------|
| SRS (IEEE 830) | `docs/planning/requirements_ieee830.md` | 정식 요구사항 명세서 (권위 문서) |

## Design Decisions

- 자체 캘린더 엔진 없음 — Google Calendar API 연동으로 대체
- 네이티브 앱 없음 — PWA로 대체
- 자체 AI 모델 없음 — 외부 LLM API 호출
- PG사 결제·양방향 동기화·연말 리포트는 현재 범위 외 (V2 후보)
- 인앱 상점은 무료 재화만 운영
- 병렬 개발: Part A(인증) 완료 후 B·D·E·F·H 동시 착수 (SRS 1.4절 참조)

## UI Theme

다크 모드 기반 게임 UI. 배경 `#0D1117`, 강조 `#8B5CF6`(퍼플), 성공 `#06D6A0`(시안), 보상 `#FFD700`(골드), 경고 `#FF6B6B`(레드).
