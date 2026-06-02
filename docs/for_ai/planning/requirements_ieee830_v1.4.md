# EXP Calendar — 소프트웨어 요구사항 명세서 (SRS)

> **표준 기반**: IEEE 830-1998 Software Requirements Specification  
> **문서 버전**: v1.4  
> **최종 수정일**: 2026-06-03  
> **프로젝트명**: EXP Calendar — 게이미피케이션 기반 일정 관리 시스템

> **v1.4 개정 요지**: UI/UX 와이어프레임 v1.4(`docs/for_ai/planning/UXUI_1.4.pdf`, 11화면)에 맞춰 정합화한 버전이다. v1.3을 기반으로 다음을 반영했다.
> - **페르소나·칭호 통합 화면**: "칭호 컬렉션" 단독 화면을 폐기하고, **메인(열람)**과 **설정(편집)** 2화면(와이어프레임 05·06)으로 통합. 페르소나(이름·말투·역사·생각)와 칭호 장착·전시·페널티·복구를 한 흐름에 묶었다.
> - **"소환(가챠)" → "스킨 뽑기"**: 뽑기 대상은 **캐릭터 외형(스킨)**으로 한정한다. 페르소나(성격)는 사용자가 자유 편집하며 뽑기 대상이 아니다. 페르소나는 *성격 + 스킨 프리셋*의 결합 개념으로 정의된다(와이어프레임 07).
> - **상태 메시지(대사) 편집 위치 명시**: 페르소나 화면에서는 *역사·자주 하는 생각*까지만 편집하고, **HUD/쇼케이스에 표시되는 상태 대사**는 통계·등급 화면(와이어프레임 09)에서 수정한다.
> - **상점 시드 갱신**(와이어프레임 08): 픽셀 모자(120P, 머리 장식), 네온 오라(260P, 이펙트), 배경: 우주(400P, 쇼케이스 배경) 등 와이어프레임 예시와 정합화.
> - **와이어프레임 ↔ UI-ID ↔ FR-ID 매핑 표**를 3.1.1절 말미에 신설.
>
> v1.3 변경분(소환 기반 단일 캐릭터 수집·통합 설정·구조화 페르소나·등급 5단계·스트릭·차등 퀘스트 보상)은 그대로 유지된다. 원본 v1.2(`Legacy/requirements_ieee830_v1.2.md`)와 v1.3(`requirements_ieee830_v1.3.md`)은 변경 없이 보존된다. v1.4에서 신설/변경된 항목은 본문에 `[v1.4]` 태그로, v1.3 기존 표기는 `[v1.3]` 그대로 둔다.

#### 팀 역할 분담

| 담당 | 이름 | 범위 |
|------|------|------|
| **인프라** | 정다우 | 온프레미스 서버 구축, Docker, CI/CD, DB 운영, 배포 파이프라인 |
| **개발** | 신강민 | FE(Next.js) + BE(Go/Gin) 기능 구현, API 개발, 테스트 |
| **발표** | 백인서 | 발표 자료 제작, 데모 시나리오 구성, 프레젠테이션 |

---

## 1. Introduction (서론)

### 1.1 Purpose (목적)

본 문서는 게이미피케이션 기반 일정 관리 시스템 **'EXP Calendar'**의 소프트웨어 요구사항을 IEEE 830-1998 표준에 따라 명세한다.

EXP Calendar는 사용자의 할 일(귀찮은 일)을 게임화하여 시작의 허들을 낮추고, 시각적 보상과 성취감을 통해 지속적인 일정 관리를 돕는 시스템이다.

본 문서의 목적은 다음과 같다:

- 개발팀, 기획자, 이해관계자 간 요구사항에 대한 **공통 이해 확보**
- OMO(멀티 에이전트 오케스트레이션) 기반 병렬 개발을 위한 **명확한 명세 기준 제공**
- 테스트 및 검증의 **기준 문서** 역할 수행
- 향후 유지보수·확장 시 **변경 영향 분석의 기초 자료** 제공

### 1.2 Document Conventions (문서 규약)

| 규약 | 설명 |
|------|------|
| **요구사항 ID 체계** | `[카테고리]-[번호]` 형식. 예: `FR-AUTH-01` (기능-인증-01번) |
| **우선순위 표기** | `필수` — 반드시 구현 / `권장` — 목표, 일정에 따라 조정 가능 / `선택` — 현재 범위 외 (V2 후보) |
| **용어 강조** | **굵은 글씨**는 정의된 기술 용어 또는 핵심 개념 |
| **Mermaid 다이어그램** | 시스템 구조 및 흐름도는 Mermaid 코드 블록으로 표현 |

본 문서 전체에서 개별 요구사항에 명시된 우선순위가 없는 경우, 해당 요구사항은 `필수`로 간주한다.

### 1.3 Intended Audience and Reading Suggestions (대상 독자 및 읽는 방법)

| 대상 독자 | 권장 읽기 섹션 | 설명 |
|-----------|---------------|------|
| **프로젝트 관리자** | 1장, 2장 전체 | 제품 범위, 제약사항, 일정 의존성 파악 |
| **개발자 (FE/BE)** | 2.1, 3.1, 3.2, 3.3, 3.4 | 인터페이스 명세, 기능 요구사항, DB 구조 |
| **OMO 에이전트 (AI)** | 3장 전체 | 구현 명세 기반 코드 생성에 필요한 구체적 요구사항 |
| **QA / 테스터** | 3.2, 3.3, 3.6 | 기능·성능 검증 기준, 품질 속성 |
| **디자이너** | 2.1, 3.1.1 | 시스템 맥락, UI 요구사항 |
| **이해관계자 / 발표 청중** | 1장, 2.2 | 프로젝트 개요와 핵심 기능 요약 |

### 1.4 Product Scope (제품 범위)

**EXP Calendar**는 Google Calendar를 기반으로, 사용자의 일정 완료에 대해 경험치(EXP)·포인트·칭호를 보상하고, LLM 기반 캐릭터 페르소나와 소셜 쇼케이스를 제공하는 게이미피케이션 일정 관리 시스템이다.

#### 범위 내 (In Scope) — 병렬 개발 파트 분할

> **개발 기한**: 1주(신강민 담당). 각 파트는 독립적으로 병렬 개발 가능하도록 설계되었다. Subagent가 파트별로 분담하여 동시 구현한다.

| Part | 영역 | 포함 요구사항 | 우선순위 | 의존성 |
|------|------|---------------|:--------:|--------|
| **A — 인증·캘린더** | Google OAuth, JWT, GCal 연동 | FR-AUTH-01~03 | 필수 | 없음 (최우선 착수) |
| **B — 게이미피케이션 엔진** | EXP·포인트·레벨업·일일한도·설문·퀘스트(차등 보상·보너스) | FR-GAME-01·03~06 | 필수 | Part A (사용자 인증) |
| **C — 칭호·페널티** | 칭호 부여(8종)·등급·페널티 복구 | FR-TITLE-01·04 | 필수 | Part B (EXP/레벨) |
| **D — 상점·아이템** | 인앱 상점, 무료 재화 구매(쇼케이스 배경 포함) | FR-SHOP-01·03 | 필수 | Part A (사용자 인증) |
| **E — LLM 페르소나·쇼케이스** | 구조화 페르소나·말투 변환, 공개 프로필 열람·검색 | FR-SOC-01~04 | 필수 | Part A (사용자 인증) |
| **F — 알림** | Push 알림, 일정 리마인더 | FR-NOTI-01~02 | 필수 | Part A (사용자 인증) |
| **G — 통계·잔디 그래프** | 잔디 그래프, 시계열, 등급(D~S), 스트릭 | FR-STAT-02 | 필수 | Part B (보상 데이터) |
| **H — 프론트엔드 UI** | 캘린더·퀘스트·통계·소환·설정 화면, 게임 HUD, 다크 테마, 반응형 | UI-01~12 | 필수 | Part A~G·K의 API |
| **I — 휴면 계정 정책** | 자동 휴면, 복귀 보상, 경고 알림 | FR-DORM-01~06, FR-NOTI-03 | 권장 | Part B + F |
| **J — 고급 기능** | 난이도 자동 산정, 칭호 분리·강등, 고급 통계 | FR-GAME-02, FR-TITLE-02~03, FR-STAT-01·03 | 권장 | Part B + C |
| **K — 소환·캐릭터 수집** `[v1.3]` | 가챠 소환(단차/10연차), 확률·천장, 소환권, 도감, **단일 캐릭터 장착(펫 육성 없음)** | FR-SUMMON-01~05 | 권장 | Part B + D (포인트 재화) |
| **L — 통합 설정** `[v1.3]` | 언어·시간대·주시작·시간표기·테마·캐릭터 크기·동기화·내보내기·알림 설정 | FR-SET-01~06 | 필수 (일부 항목 동작은 V2) | Part A·F |

**병렬 실행 전략:**
```
[Part A: 인증·캘린더] ──완료──┬──→ [Part B: 게이미피케이션] ──→ [Part C: 칭호]
                              ├──→ [Part D: 상점] ──→ [Part K: 소환·수집]
                              ├──→ [Part E: LLM·쇼케이스]    ──→ [Part G: 통계]
                              ├──→ [Part F: 알림] ──→ [Part L: 통합 설정]
                              └──→ [Part H: 프론트엔드 UI] (API 완성에 따라 점진적 통합)
```
- Part A 완료 후 B·D·E·F·H·L은 **동시 착수** 가능
- Part K(소환·수집)는 Part D(재화) 완성 후 착수
- Part I·J·K는 필수 파트 완성 후 **여유 시** 진행

**파트별 완료 기준:**
- **Part A**: Google 로그인 → JWT 발급 → GCal 일정 목록 조회 API 동작
- **Part B**: 일정 완료 시 EXP/포인트 지급, 레벨업, 일일 한도 적용 확인
- **Part C**: 조건 충족 시 칭호 자동 부여, 방어 아이템으로 페널티 복구
- **Part D**: 상점 아이템 목록 조회, 포인트로 구매 처리
- **Part E**: 텍스트 입력 → LLM 말투 변환, 타 사용자 쇼케이스 열람
- **Part F**: 일정 시작 전 Push 알림 발송
- **Part G**: 잔디 그래프 렌더링
- **Part H**: 캘린더 그리드/리스트 뷰, HUD, 반응형 레이아웃 동작
- **Part K** `[v1.3]`: 소환 1회 시 확률표 기반 캐릭터 획득, 도감 반영, 단일 캐릭터 장착
- **Part L** `[v1.3]`: 설정 화면에서 언어/시간대/테마/알림 항목 노출·저장 (동작이 V2인 항목은 "예정" 표기)

#### 범위 외 (Out of Scope)

- 자체 캘린더 엔진 개발 (Google Calendar API 연동으로 대체)
- 네이티브 iOS / Android 앱 (PWA로 대체)
- 실시간 멀티플레이어 / 소셜 피드 기능
- 자체 AI 모델 학습 (외부 LLM API 호출로 대체)

**V2 후보 (현재 범위 외):**

| 요구사항 ID | 기능 | 설명 |
|-------------|------|------|
| FR-AUTH-04 | Google Calendar 양방향 동기화 | 완료 상태를 Google Calendar에 반영. `[v1.3]` 설정 화면에 토글을 **노출**하되 실제 동기화 동작은 V2 |
| FR-STAT-04 | 연말 결산 개인화 리포트 | 연간 활동 Recap 제공 |
| FR-SHOP-02 | PG사 연동 유료 결제(IAP) | 인앱 유료 재화 판매 |
| FR-SET-04 `[v1.3]` | 다국어(i18n) UI | 한국어 외 English·日本語. 설정 화면에 **언어 선택을 노출**하되 실제 번역 적용은 V2 |
| FR-SET-05 `[v1.3]` | 다중 컬러 테마 전환 | 기본 Cosmic Purple 외 Game Boy·Synthwave·Amber CRT. 설정 화면에 **목록을 노출**하되 실제 테마 전환 적용은 V2 |

> `[v1.3]` **A-그룹(설정 노출/동작 V2) 처리 원칙**: 위 FR-AUTH-04·FR-SET-04·FR-SET-05는 설정 화면(FR-SET-01)에 선택 UI로 노출하되, 비(非)기본 옵션 선택 시 "예정(V2)" 안내를 표시하고 실제 동작은 수행하지 않는다. UI만 선반영하여 향후 V2에서 backend 연동만 추가하면 되도록 한다.

### 1.5 References (참고 문헌)

| # | 문서명 | 위치 / URL | 비고 |
|---|--------|-----------|------|
| 1 | IEEE 830-1998 표준 | — | 본 SRS 작성 표준 |
| 2 | SRS v1.2 (원본 동결 보존) | `Legacy/requirements_ieee830_v1.2.md` | v1.3·v1.4의 기반 |
| 3 | SRS v1.3 (직전 버전) | `requirements_ieee830_v1.3.md` | 본 v1.4의 직전 버전 (정합성 비교) |
| 4 | UI/UX 와이어프레임 v1.4 | `UXUI_1.4.pdf` (페이지 PNG: `_uxui_pages_v1.4/`) | 본 v1.4의 입력 자료 |
| 5 | UI/UX 와이어프레임 v1.3 (Legacy) | `Legacy/UXUI_v1.3.pdf` (페이지 PNG: `Legacy/_uxui_pages_v1.3/`) | 직전 버전의 와이어프레임 |
| 6 | Google Calendar API 문서 | https://developers.google.com/calendar | 외부 API |
| 7 | Google OAuth 2.0 문서 | https://developers.google.com/identity | 인증 프로토콜 |
| 8 | Google Gemini API 문서 | https://ai.google.dev/api | 외부 LLM API |

---

## 2. Overall Description (전체 설명)

### 2.1 Product Perspective (제품 관점)

EXP Calendar는 독립 제품(Self-contained product)이 아니라, 다수의 외부 서비스에 의존하는 **통합 시스템(Integrated System)**이다. 아래 다이어그램은 시스템이 외부 환경과 맺는 관계를 보여준다.

#### 2.1.1 시스템 컨텍스트 다이어그램

```mermaid
flowchart LR
    User([사용자])
    System[["EXP Calendar\n시스템"]]
    Google["Google\nCalendar API"]
    GoogleAuth["Google\nOAuth 2.0"]
    LLM["LLM API\n(Google Gemini 등)"]
    PG["PG사\n결제 서비스"]
    Push["FCM /\nWeb Push"]

    User -- "로그인 · 일정 CRUD\n퀘스트 완료 · 상점 구매\n쇼케이스 조회" --> System
    System -- "보상 지급 · 칭호 부여\n알림 · 통계 리포트" --> User

    System <--> GoogleAuth
    System <--> |"일정 읽기\n(단방향)"| Google
    System -- "텍스트 변환 요청" --> LLM
    LLM -- "캐릭터 말투 결과" --> System
    System -.-> |"결제 요청/결과"| PG
    System -- "알림 발송" --> Push
```

> 실선: 현재 구현 범위 / 점선: V2 후보 (현재 범위 외)

#### 2.1.2 시스템 아키텍처 개요

```mermaid
flowchart TB
    subgraph Client["Client (PWA)"]
        NextJS["Next.js (React)\n반응형 웹"]
    end

    subgraph Server["Backend Server — Go (Gin/Echo)"]
        AuthSvc["Auth Service\n(OAuth + JWT)"]
        CalSvc["Calendar Service\n(일정 CRUD)"]
        GameSvc["Gamification Engine\n(EXP·칭호·퀘스트)"]
        LLMSvc["LLM Service\n(페르소나 변환)"]
        ShopSvc["Shop Service\n(상점·결제)"]
        NotiSvc["Notification Service\n(Push 알림)"]
        StatSvc["Stats Service\n(통계·잔디 그래프)"]
    end

    subgraph DataStore["Data Store"]
        PG_DB[("PostgreSQL\n(pgvector)")]
    end

    subgraph External["External Services"]
        GCal["Google Calendar API"]
        GAuth["Google OAuth 2.0"]
        LLMAPI["LLM API"]
        PGAPI["PG사 API"]
        FCM["FCM / Web Push"]
    end

    Client <--> |"REST API\n(JSON + JWT)"| Server
    AuthSvc <--> GAuth
    CalSvc <--> GCal
    LLMSvc <--> LLMAPI
    ShopSvc -.-> PGAPI
    NotiSvc --> FCM
    Server <--> PG_DB
```

#### 2.1.3 기술 스택

| 계층 | 기술 | 선정 사유 |
|------|------|-----------|
| 프론트엔드 | **Next.js (React)** | 반응형 웹 + PWA, SSR/SSG 지원 |
| 백엔드 | **Go (Gin/Echo)** | 고성능 동시성 처리, 빠른 LLM API 통신 |
| 데이터베이스 | **PostgreSQL** | 안정적 트랜잭션, pgvector 확장으로 AI 벡터 데이터 대응 |
| 인프라 | **온프레미스** (Docker Compose, Nginx, 로컬 스토리지) | 비용 절감, 직접 관리 |
| CI/CD | **GitHub Actions** | 자동 빌드·테스트·배포 파이프라인 |
| 컨테이너 | **Docker** | 환경 일관성 보장 |

### 2.2 Product Functions (제품 기능 요약)

본 시스템의 핵심 기능을 아래와 같이 요약한다. 각 기능의 상세 명세는 3.2절에서 기술한다.

| # | 기능 모듈 | 요약 설명 |
|---|-----------|-----------|
| F-01 | **계정 및 인증** | Google OAuth 2.0 로그인, JWT 세션 관리 |
| F-02 | **캘린더 연동** | Google Calendar API 일정 수집 및 CRUD |
| F-03 | **작업 난이도 관리** | 온보딩 설문·수행 이력 기반 난이도 자동 산정 |
| F-04 | **일일 퀘스트** | 매일 고정 미션 3종 제공 및 달성 보상 |
| F-05 | **보상 엔진** | 일정 완료 시 EXP·포인트 지급 (일일 한도 적용) |
| F-06 | **칭호·페널티** | 목표 달성 칭호 부여, 기한 초과 강등·수식어 부착 |
| F-07 | **상점·결제** | 인앱 상점(무료 재화) |
| F-08 | **LLM 페르소나** | 캐릭터 성격·칭호 이력 기반 말투 변환 |
| F-09 | **쇼케이스 (소셜)** | 캐릭터·칭호·잔디 그래프·등급 공개 프로필 |
| F-10 | **휴면 계정 정책** *(권장)* | 14일 미접속 휴면 전환, 복귀 보상 패키지 — 핵심 루프 완성 후 구현 |
| F-11 | **알림 (Push)** | 일정·휴면 경고 Push 알림 |
| F-12 | **통계·리포트** | 잔디 그래프, 시계열 그래프, 등급 산출(D~S), 스트릭 |
| F-13 | **소환·캐릭터 수집** `[v1.3]` | 가챠 소환으로 캐릭터 수집(도감), 확률·천장, 소환권. 단일 캐릭터 장착(펫 육성 없음) |
| F-14 | **통합 설정** `[v1.3]` | 언어·시간대·주시작·시간표기·테마·캐릭터 크기·연동·데이터 내보내기·알림 설정 |

#### 핵심 프로세스 흐름도

```mermaid
flowchart TB
    subgraph 사용자["사용자 영역"]
        U_Login["로그인"]
        U_Schedule["일정 등록/완료"]
        U_Quest["퀘스트 달성"]
        U_Shop["상점 구매"]
        U_Showcase["쇼케이스 조회"]
        U_Persona["페르소나 문구 입력"]
    end

    subgraph P1["인증"]
        Auth["OAuth 2.0 + JWT"]
    end

    subgraph P2["일정 관리"]
        ScheduleMgr["일정 CRUD"]
        GCalSync["GCal 동기화"]
        Difficulty["난이도 산정"]
    end

    subgraph P3["게이미피케이션"]
        EXP_Engine["EXP/포인트 엔진"]
        Quest_Engine["퀘스트 관리"]
        Title_Engine["칭호 처리"]
        Dormant["휴면 정책"]
    end

    subgraph P4["소셜"]
        Showcase_Mgr["쇼케이스"]
        LLM_Service["LLM 페르소나"]
        Stats["통계/잔디 그래프"]
    end

    subgraph P5["상점"]
        Shop["아이템 관리"]
        Payment["결제 (PG)"]
    end

    U_Login --> Auth
    U_Schedule --> ScheduleMgr --> GCalSync
    ScheduleMgr --> Difficulty
    U_Schedule -- "완료" --> EXP_Engine --> Title_Engine
    U_Quest --> Quest_Engine --> EXP_Engine
    Dormant -- "경고 알림" --> U_Login
    U_Persona --> LLM_Service --> Showcase_Mgr
    U_Showcase --> Showcase_Mgr --> Stats
    U_Shop --> Shop --> Payment
```

### 2.3 User Classes and Characteristics (사용자 등급 및 특성)

| 사용자 등급 | 특성 | 기술 수준 | 사용 빈도 |
|-------------|------|-----------|-----------|
| **일반 사용자** | 일정 관리를 자주 미루며, 게이미피케이션 요소(캐릭터 육성, 칭호 수집)를 통해 동기부여를 얻고자 하는 사용자 | Google 계정 보유, 웹 브라우저 사용 가능한 일반 수준 | 매일 1~3회 접속 |
| **파워 유저** | 적극적으로 일일 퀘스트를 달성하고, 쇼케이스를 꾸미며, 상점 아이템을 수집하는 열성 사용자 | 중급 이상 | 매일 5회 이상 접속 |
| **휴면 사용자** | 14일 이상 미접속 후 복귀하거나, 복귀하지 않는 사용자 | 무관 | 극히 낮음 → 복귀 시 집중 사용 |
| **열람자** | 타 사용자의 쇼케이스만 열람하는 비주력 사용자 | 낮음 | 비정기적 |

### 2.4 Operating Environment (운영 환경)

#### 클라이언트 환경

| 항목 | 최소 사양 | 권장 사양 |
|------|-----------|-----------|
| 브라우저 | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ | 최신 버전 |
| 해상도 | 360×640 (모바일) | 1920×1080 (데스크톱) |
| 네트워크 | 3G 이상 | Wi-Fi / LTE 이상 |
| JavaScript | ES2020 지원 | ES2022 지원 |
| PWA 설치 | 선택적 | 권장 |

#### 운영 서버 환경

| 항목 | 사양 |
|------|------|
| OS | Linux (Ubuntu 26.04 LTS) |
| 런타임 | Go 1.21+, Node.js 20 LTS+ |
| DB | PostgreSQL 15+ (pgvector 확장 호환) |
| 메모리 | 최소 4GB RAM |
| 스토리지 | 최소 50GB SSD |
| 네트워크 | HTTPS (TLS 1.2+), 로드밸런서 |
| 인프라 | 온프레미스 (Docker Compose, Nginx 리버스 프록시) |

### 2.5 Design and Implementation Constraints (설계 및 구현 제약사항)

| ID | 제약사항 | 설명 |
|----|----------|------|
| DC-01 | **프론트엔드 프레임워크** | Next.js (React) 사용 필수 — PWA 적용 포함 |
| DC-02 | **백엔드 언어** | Go (Golang), Gin 또는 Echo 프레임워크 사용 |
| DC-03 | **데이터베이스** | PostgreSQL 15+ 사용, pgvector 확장 호환성 확보 |
| DC-04 | **포인트 일일 한도** | 하루 획득 가능한 무료 포인트의 최대 한도 설정 (경제 인플레이션 방지) |
| DC-05 | **LLM 비용 최적화** | LLM API 호출 시 토큰 수 및 호출 횟수 제한 적용 필수 |
| DC-06 | **Google API 할당량** | Google Calendar API 일일 요청 할당량(Quota) 준수 |
| DC-07 | **페널티 리셋 불가** | 칭호 페널티는 시스템에 의해 임의 초기화 불가, 반드시 정상 일정 완료 또는 방어 아이템 사용으로만 복구 |
| DC-08 | **개발 기간** | 2주 (1주 개발 + 1주 테스트) 내 완성 및 배포 |

### 2.6 User Documentation (사용자 문서화)

| 문서 | 형태 | 설명 |
|------|------|------|
| **사용자 가이드** | 앱 내 온보딩 튜토리얼 | 최초 가입 시 인터랙티브 가이드로 핵심 기능 안내 |
| **도움말 / FAQ** | 웹 페이지 | 주요 기능별 사용법, 자주 묻는 질문 정리 |
| **게이미피케이션 규칙 안내** | 앱 내 정보 페이지 | EXP 산출 방식, 칭호 획득 조건, 페널티 규칙 투명 공개 |
| **업데이트 노트** | 앱 내 / 웹 | 버전별 변경 사항 공지 |
| **README** | GitHub 저장소 | 프로젝트 개요, 설치·실행 방법, 환경 변수 목록 |

### 2.7 Assumptions and Dependencies (가정 및 종속성)

#### 가정 (Assumptions)

| # | 가정 |
|---|------|
| A-01 | 사용자는 유효한 Google 계정을 보유하고 있다. |
| A-02 | 사용자 디바이스의 브라우저가 Service Worker 및 Push API를 지원한다. |
| A-03 | 사용자는 한국어를 주 언어로 사용한다. **기본 언어는 한국어**이며, English·日本語 선택 UI는 설정에 노출하되 실제 번역 적용은 V2(FR-SET-04). `[v1.3]` |
| A-04 | LLM API(Google Gemini 등)의 가용성이 99% 이상 유지된다. |
| A-05 | 초기 사용자 규모는 1,000명 이내로 예상한다. |

#### 종속성 (Dependencies)

| # | 종속 대상 | 영향 범위 | 리스크 |
|---|-----------|-----------|--------|
| D-01 | **Google OAuth 2.0** | 전체 인증 기능 | 심사 지연 시 테스트 모드 운영 |
| D-02 | **Google Calendar API** | 일정 연동 기능 | API 할당량 초과 시 일정 동기화 지연 |
| D-03 | **LLM API (Google Gemini 등)** | 페르소나 변환 기능 | API 장애 시 변환 기능 일시 불가 (캐시 폴백) |
| D-04 | **온프레미스 서버** | 전체 서비스 운영 | 서버 장애 시 수동 복구 필요, 모니터링 설정 필수 |
| D-05 | **FCM / Web Push** | 알림 기능 | 서비스 장애 시 알림 지연 (재시도 로직 적용) |

---

## 3. Specific Requirements (구체적 요구사항)

### 3.1 External Interface Requirements (외부 인터페이스 요구사항)

#### 3.1.1 User Interfaces (사용자 인터페이스)

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| UI-01 | 노션 캘린더(Notion Calendar)와 유사한 웹 기반의 **그리드**(월/주 뷰) 및 **리스트**(일 뷰) 형태 뷰를 제공한다. | 필수 |
| UI-02 | 다크 모드 기반의 게임 UI 테마를 기본 적용한다 (기본 테마 **Cosmic Purple** — 배경: `#0D1117`, 강조: `#8B5CF6`). 추가 테마(Game Boy·Synthwave·Amber CRT)는 설정에 노출하되 적용은 V2(FR-SET-05). `[v1.3]` | 필수 |
| UI-03 | **반응형 레이아웃**으로 데스크톱(1920px)·태블릿(768px)·모바일(360px) 환경을 지원한다. | 필수 |
| UI-04 | 일정 **드래그 앤 드롭**으로 직관적 일정 이동을 지원한다. | 필수 |
| UI-05 | 게임 HUD(EXP 바, 레벨, 포인트 표시)를 상시 노출한다. | 필수 |
| UI-06 | LLM 텍스트 변환 요청 시 **로딩 인디케이터**(스켈레톤 또는 스피너)를 표시한다. | 필수 |
| UI-07 | 모든 에러 상황에서 **사용자 친화적 에러 메시지**를 표시한다. | 필수 |
| UI-08 `[v1.3]` | **일일 퀘스트 화면**: 3종 미션 카드(진행률 바), 전체 완료 보너스·스트릭, 리셋 카운트다운을 노출한다. | 필수 |
| UI-09 `[v1.4]` | **스킨 뽑기 화면**: 픽업 배너(LEGENDARY 확률 2배), 확률표(등급별 %), 천장 카운트, 단챠(100P)·10연챠(900P) 버튼, **스킨 도감** 그리드(획득/미획득 시각화). 뽑기 대상은 외형(스킨)에 한정한다. | 권장 |
| UI-10 `[v1.4]` | **통계·등급 화면**: 내 캐릭터 프로필(외형·등급·전시 칭호), **상태 메시지(대사) 편집**, 주간·월간 성공률·최장 스트릭, 잔디 그래프, 성공/실패 시계열, 등급(D~S) 게이지·상위 백분위·다음 등급까지 진행률을 제공한다. | 필수 |
| UI-11 `[v1.3]` | **통합 설정 화면**: 일반(언어·시간대·주 시작 요일·시간 표기)·연동/계정·알림·테마 섹션을 제공하며, 동작이 V2인 항목은 "예정" 안내를 표기한다. | 필수 |
| UI-12 `[v1.3]` | 캐릭터 표시 크기(0.8×/1×/1.3×) 조절을 제공한다. | 권장 |
| UI-13 `[v1.4]` | **페르소나·칭호 메인(열람) 화면**: 내 정체성(외형·등급·장착 칭호·말투/성격 요약·역사·자주 하는 생각), 장착·전시 칭호 카드, **페널티 활성 인디케이터**(전시 중인 칭호에 페널티 적용 시 사용자에게 명시적으로 노출), 칭호 관리 진입점을 제공한다. (와이어프레임 05) | 필수 |
| UI-14 `[v1.4]` | **페르소나·칭호 설정(편집) 화면**: 스킨 변경 진입점(→ 스킨 뽑기·도감), 성격 만들기(이름·말투·역사·자주 하는 생각, 글자 수 카운터 포함), 칭호 장착·전시 토글, 페널티 복구(정상 완료 안내 + 방어권 사용 버튼, 보유 수량 표기)를 제공한다. (와이어프레임 06) | 필수 |

##### 와이어프레임 ↔ UI-ID ↔ FR-ID 매핑 `[v1.4]`

UXUI v1.4 11화면(`docs/for_ai/planning/UXUI_1.4.pdf`)을 본 SRS의 UI 요구사항 및 기능 요구사항과 1:1 매핑한다. 본 표는 구현 시 화면 단위 작업 분배와 인수 테스트의 기준 추적표 역할을 한다.

| # | 화면 | 매핑 UI-ID | 주요 매핑 FR-ID |
|:-:|------|-----------|-----------------|
| 01 | 캘린더 · 월(그리드) | UI-01·02·03·04·05 | FR-AUTH-03, FR-GAME-05 |
| 02 | 캘린더 · 주(타임라인) | UI-01·03·04·05 | FR-AUTH-03 |
| 03 | 캘린더 · 일(리스트) | UI-01·03·05 | FR-GAME-05 (난이도별 보상 표시) |
| 04 | 일일 퀘스트 | UI-08 | FR-GAME-04·06 |
| 05 | 페르소나·칭호 (메인 · 열람) | UI-13 | FR-TITLE-01·02·03·04, FR-SOC-02 |
| 06 | 페르소나·칭호 (설정 · 편집) | UI-14 | FR-SOC-02, FR-TITLE-02·03·04, FR-SHOP-03 (방어권 사용) |
| 07 | 스킨 뽑기 | UI-09 | FR-SUMMON-01~05 |
| 08 | 상점 | UI-15 (신설 필요) | FR-SHOP-01·03 |
| 09 | 통계·등급 (내 캐릭터) | UI-10·12 | FR-STAT-01·02·03·05·06 |
| 10 | 쇼케이스 | UI-16 (신설 필요) | FR-SOC-01·03·04 |
| 11 | 설정 | UI-02·11·12 | FR-SET-01~06, FR-NOTI-01·02·03 |

> 전역 적용 항목(UI-02 다크 테마, UI-03 반응형, UI-06 로딩 인디케이터, UI-07 에러 메시지)은 화면별 매핑에 일일이 표기하지 않는다.

#### 3.1.2 Hardware Interfaces (하드웨어 인터페이스)

본 시스템은 웹 기반 애플리케이션으로, 특정 하드웨어와의 직접적인 인터페이스는 없다. 사용자 디바이스의 하드웨어 요구사항은 2.4절(운영 환경)을 참조한다.

#### 3.1.3 Software Interfaces (소프트웨어 인터페이스)

| ID | 인터페이스 | 프로토콜 | 방향 | 데이터 형식 | 설명 |
|----|-----------|----------|:----:|:-----------:|------|
| SI-01 | **Google OAuth 2.0** | HTTPS/REST | 양방향 | JSON | 사용자 인증 및 액세스·리프레시 토큰 발급 |
| SI-02 | **Google Calendar API** | HTTPS/REST | 단방향 | JSON | 일정 이벤트 데이터 읽기 |
| SI-03 | **LLM API** (Google Gemini 등) | HTTPS/REST | 양방향 | JSON | 페르소나 텍스트 변환 요청·응답 |
| SI-04 | **PG사 결제 API** *(선택)* | HTTPS/REST | 양방향 | JSON | 결제 요청·결과 수신·환불 처리 |
| SI-05 | **FCM / Web Push** | HTTPS | 단방향 | JSON | Push 알림 메시지 발송 |
| SI-06 | **PostgreSQL** | TCP/IP | 양방향 | SQL | Connection Pool 기반 DB 통신 |

#### 3.1.4 Communications Interfaces (통신 인터페이스)

| ID | 요구사항 | 설명 |
|----|----------|------|
| CI-01 | **HTTPS 필수** | 모든 클라이언트-서버 간 통신은 TLS 1.2 이상의 HTTPS를 사용한다. |
| CI-02 | **RESTful API** | 클라이언트-서버 간 통신은 RESTful API(JSON 형식)를 사용한다. |
| CI-03 | **JWT 인증 헤더** | 인증이 필요한 모든 API 요청에 `Authorization: Bearer <JWT>` 헤더를 포함한다. |
| CI-04 | **CORS 정책** | 허용된 오리진에서만 API 접근을 허가한다. |

### 3.2 Functional Requirements (기능적 요구사항)

#### 3.2.1 인증 및 연동

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-AUTH-01 | Google OAuth 2.0 기반 소셜 로그인을 지원한다. | 필수 |
| FR-AUTH-02 | JWT 기반 세션 관리를 적용한다. 액세스 토큰 만료 시 리프레시 토큰으로 자동 갱신한다. | 필수 |
| FR-AUTH-03 | Google Calendar API 연동으로 외부 일정을 읽어온다 (단방향). | 필수 |
| FR-AUTH-04 | Google Calendar 양방향 동기화(완료 상태 반영)를 구현한다. | 선택 |

#### 3.2.2 난이도 및 보상

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-GAME-01 | 최초 가입 시 **성향 설문**을 트리거하여 초기 레벨 및 난이도 기준을 설정한다. | 필수 |
| FR-GAME-02 | 과거 수행 이력을 분석하여 작업 **난이도를 자동 산정**한다. *(미구현 시 사용자 수동 선택(상/중/하)으로 대체 가능)* | 권장 |
| FR-GAME-03 | 저레벨 사용자에 **EXP/포인트 가중치**를 부여하여 초기 성장을 돕는다. | 필수 |
| FR-GAME-04 | **일일 퀘스트** 3종(계획 2개 추가, 1개 완료, 쇼케이스 방문) 완료 시 **유형별 차등 포인트**를 지급한다. (ADD_PLAN 20P / COMPLETE_PLAN 30P / VISIT_SHOWCASE 15P) `[v1.3]` | 필수 |
| FR-GAME-05 | 일정 완료 시 난이도에 따라 차등 EXP·포인트를 지급하며, **일일 한도**를 적용한다. | 필수 |
| FR-GAME-06 `[v1.3]` | 일일 퀘스트 **3종 전체 완료 시 보너스 포인트(+50P)**를 지급하고, **연속 달성 스트릭** 보너스(7일 연속 = ×2)를 적용한다. 모든 포인트 지급은 일일 한도(DC-04)를 따른다. | 권장 |

#### 3.2.3 휴면 계정 정책

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-DORM-01 | 14일 이상 연속 미접속 시 **자동 휴면 전환**한다. | 권장 |
| FR-DORM-02 | 휴면 복귀 시 **성향 설문을 재실행**한다. | 권장 |
| FR-DORM-03 | 복귀 보상: 14일치 최대 획득량 이상의 **대량 포인트 즉시 지급**. | 권장 |
| FR-DORM-04 | 복귀 버프: 7일간 **1.5배 EXP** 획득. | 권장 |
| FR-DORM-05 | 최초 복귀 시 **등급 하락 방어권 3개** 무료 지급. | 권장 |
| FR-DORM-06 | 13일차에 **접속 유도 경고 알림**을 발송한다. (FR-NOTI-03으로 구현) | 권장 |

> **참고**: 휴면 계정 정책(FR-DORM-01~06)은 배치 스케줄러가 필요하며, 핵심 루프(일정→보상→칭호)와 독립적이다. 1주 개발 기한 내 핵심 기능 우선 완성 후 여유 시 구현한다.

#### 3.2.4 칭호 및 페널티

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-TITLE-01 | 작업 완료 조건에 따라 칭호(총 **8종**, 부록 C)를 부여하고, **등급별 색상·아이콘**(COMMON/RARE/EPIC/LEGENDARY)으로 구분한다. `[v1.3]` | 필수 |
| FR-TITLE-02 | **장착용 칭호**(프로필)와 **전시용 칭호**(쇼케이스)를 분리 선택할 수 있다. | 권장 |
| FR-TITLE-03 | 일정 지연 시 장착 칭호를 **자동 강등**하고 **부정적 수식어**를 부착한다. | 권장 |
| FR-TITLE-04 | 페널티는 **정상 일정 완료 또는 방어 아이템 사용 시에만 복구** 가능하다. | 필수 |

#### 3.2.5 상점 및 결제

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-SHOP-01 | **앱 내 상점**을 구현한다. | 필수 |
| FR-SHOP-02 | PG사 연동을 통한 **포인트 유료 결제(IAP)**를 지원한다. | 선택 |
| FR-SHOP-03 `[v1.4]` | 판매 항목: 캐릭터 커스터마이징 재화(예: 픽셀 모자 120P · 네온 오라 260P · **배경: 우주** 400P), 등급 하락 방어권, 캐릭터 성격·말투 **프리셋** 아이템, **스킨 뽑기권**. 탭은 `커스터마이징`/`방어 아이템`/`페르소나` 3종으로 구성한다. (와이어프레임 08) | 필수 |

#### 3.2.6 LLM 페르소나 및 쇼케이스

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-SOC-01 | 타 사용자의 캐릭터·칭호·잔디 그래프·등급을 **열람**할 수 있다. | 필수 |
| FR-SOC-02 `[v1.4]` | 페르소나는 **성격(구조화 필드: 이름·말투/성격·역사·자주 하는 생각) + 스킨(외형 프리셋)**의 결합으로 정의된다. 성격 필드는 사용자가 자유 편집(무료)하며, **스킨은 뽑기(FR-SUMMON)로 획득**한다. 성격 필드는 System Prompt(성격·칭호 이력 주입)에 주입되어 사용자 입력 텍스트를 **캐릭터 말투로 변환**해 쇼케이스에 전시된다. 상점 `페르소나` 프리셋은 선택적 보조 아이템이다. | 필수 |
| FR-SOC-03 | 쇼케이스에서 타인의 **상세 일정·실패율은 비공개** 처리한다. | 필수 |
| FR-SOC-04 `[v1.3]` | 쇼케이스에서 **다른 사용자 검색**(표시 이름 기준)과 추천 목록 열람을 제공한다. | 권장 |

#### 3.2.7 알림

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-NOTI-01 | 모바일·웹 환경에서 **Push 알림**을 지원한다 (FCM / Web Push). | 필수 |
| FR-NOTI-02 | 일정 시작 전 알림 발송 (기본 15분 전, **사용자 커스텀 설정** 지원). | 필수 |
| FR-NOTI-03 | 휴면 전환 임박(13일차) **경고 알림**을 발송한다. | 권장 |

#### 3.2.8 통계 및 리포트

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-STAT-01 | 일일 성공/실패 **시계열 그래프**를 제공한다. | 권장 |
| FR-STAT-02 | 매일 계획 성공 여부를 **GitHub 잔디 그래프** 형태로 시각화한다. | 필수 |
| FR-STAT-03 | 주/월/연 누적 성공률로 **등급(Rating)**을 **5단계(D·C·B·A·S)**로 부여하고, 상위 백분위·다음 등급까지 진행률을 함께 표시한다. `[v1.3]` | 권장 |
| FR-STAT-04 | 연말 결산 **개인화 리포트(Recap)**를 제공한다. | 선택 |
| FR-STAT-05 `[v1.3]` | **최장 스트릭**(연속 성공 일수)과 현재 스트릭을 집계하여 통계·등급 화면에 표시한다. | 권장 |
| FR-STAT-06 `[v1.4]` | 통계·등급 화면에서 캐릭터의 **상태 메시지(대사) 편집**을 지원한다. 대사는 HUD/쇼케이스에 노출되며, 페르소나 화면(05/06)의 *역사·자주 하는 생각*과는 분리된 별도 필드이다. | 권장 |

#### 보상 처리 상세 흐름

```mermaid
flowchart LR
    A["일정 완료"] --> B{"난이도"}
    B -- "상" --> C1["EXP ×1.5"]
    B -- "중" --> C2["EXP ×1.0"]
    B -- "하" --> C3["EXP ×0.7"]
    C1 --> D{"일일 한도\n초과?"}
    C2 --> D
    C3 --> D
    D -- "No" --> E["전액 지급"]
    D -- "Yes" --> F["잔여분만 지급"]
    E --> G{"레벨업?"}
    F --> G
    G -- "Yes" --> H["레벨업 +\n칭호 검사"]
    G -- "No" --> I["DB 저장"]
    H --> J{"칭호 조건?"}
    J -- "Yes" --> K["칭호 부여\n+ 알림"]
    J -- "No" --> I
    K --> I
```

#### 3.2.9 스킨 뽑기 (소환) `[v1.4]`

> 와이어프레임 07 화면(스킨 뽑기)에 대응한다. **뽑기 대상은 캐릭터 외형(스킨)**으로 한정되며, 페르소나(성격)는 사용자가 자유 편집한다. 다마고치식 펫 육성 기능은 제공하지 않는다. v1.3의 "소환(가챠) · 캐릭터 수집"을 본 절로 대체한다(API·DB는 호환 유지).

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-SUMMON-01 `[v1.4]` | 포인트 기반 **스킨 뽑기**로 외형 스킨을 획득한다. 단챠(100P)·10연챠(900P)를 제공하며, 10연챠 시 **RARE 이상 1개 확정**. | 권장 |
| FR-SUMMON-02 | 등급별 획득 확률을 적용한다: **COMMON 60% / RARE 28% / EPIC 9% / LEGENDARY 3%**. 픽업 배너 적용 시 해당 LEGENDARY 확률을 **2배**로 가중한다. | 권장 |
| FR-SUMMON-03 | **천장(pity)**: 90회 연속 LEGENDARY 미획득 시 다음 뽑기에서 LEGENDARY 1개를 확정 지급한다. | 권장 |
| FR-SUMMON-04 `[v1.4]` | 획득 스킨은 **스킨 도감(컬렉션)**에 누적되고, 사용자는 보유 스킨 중 **1개만 현재 페르소나의 스킨으로 적용**한다. 중복 획득은 포인트로 환급한다. | 권장 |
| FR-SUMMON-05 `[v1.4]` | 뽑기 비용은 **포인트 또는 뽑기권**으로 지불한다. 뽑기권은 보상·상점을 통해 획득한다. | 권장 |

#### 3.2.10 통합 설정 `[v1.3]`

> 와이어프레임 11 화면(설정)에 대응한다. A-그룹(다국어·양방향 동기화·다중 테마)은 UI만 노출하고 동작은 V2이다(1.4절 V2 표 참조).

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-SET-01 | **통합 설정 화면**(일반 / 연동·계정 / 알림 / 테마 섹션)을 제공한다. | 필수 |
| FR-SET-02 | 일반 설정: **시간대**, **주 시작 요일**(일/월), **시간 표기**(12/24h)를 저장·적용한다. 언어는 한국어 기본(다국어는 FR-SET-04, V2). | 권장 |
| FR-SET-03 | 연동·계정: Google Calendar 연동 토글(양방향 동작은 FR-AUTH-04, V2), **데이터 내보내기(JSON 백업)**, 로그아웃, **계정/데이터 초기화(복구 불가)**. | 필수 |
| FR-SET-04 | **다국어(i18n)** — V2. (1.4절 V2 표 참조) | 선택 |
| FR-SET-05 | **다중 컬러 테마 전환** — V2. (1.4절 V2 표 참조) | 선택 |
| FR-SET-06 | 알림 설정: 채널별 토글(Push, 일정 리마인더, 휴면 경고, 칭호 획득/강등, 일일 퀘스트 리셋)과 **리마인더 시점**(5/10/15/30/60분 전)을 제공한다. (FR-NOTI 연계) | 필수 |

### 3.3 Performance Requirements (성능 요구사항)

| ID | 항목 | 목표 수치 |
|----|------|-----------|
| PR-01 | 일반 API 응답 시간 | 평균 200ms 이내, 최대 500ms |
| PR-02 | LLM 텍스트 변환 응답 | 최대 5초 이내 (로딩 인디케이터 필수) |
| PR-03 | 페이지 초기 로딩 (LCP) | 2.5초 이내 |
| PR-04 | 동시 접속자 처리 | 최소 1,000명 |
| PR-05 | 외부 API 실패 시 재시도 | 최대 3회, 지수 백오프, 에러 피드백 UI |
| PR-06 | DB 쿼리 성능 | P95 기준 100ms 이내 |
| PR-07 | PWA 오프라인 전환 | 네트워크 단절 시 3초 이내 오프라인 UI 전환 |

### 3.4 Logical Database Requirements (논리적 데이터베이스 요구사항)

#### 3.4.1 핵심 엔티티 관계 다이어그램 (ERD 개요)

```mermaid
erDiagram
    USER ||--o{ SCHEDULE : "creates"
    USER ||--o{ USER_TITLE : "earns"
    USER ||--o{ QUEST_LOG : "completes"
    USER ||--o{ PURCHASE : "makes"
    USER ||--o{ REWARD_LOG : "receives"
    USER ||--|| USER_STATS : "has"
    USER ||--o| PERSONA : "configures"
    USER ||--|| USER_SETTINGS : "has"
    USER ||--o{ USER_CHARACTER : "collects"
    USER ||--o{ SUMMON_LOG : "summons"

    TITLE ||--o{ USER_TITLE : "assigned_to"
    SCHEDULE ||--o| REWARD_LOG : "generates"
    ITEM ||--o{ PURCHASE : "purchased_in"
    CHARACTER ||--o{ USER_CHARACTER : "collected_as"
    CHARACTER ||--o{ SUMMON_LOG : "drawn_in"

    USER {
        uuid id PK
        varchar email UK
        varchar display_name
        int level
        bigint total_exp
        int current_points
        int daily_points_earned
        int summon_tickets
        uuid active_character_id FK
        enum account_status
        timestamp last_login_at
        timestamp created_at
    }

    SCHEDULE {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        enum difficulty
        enum status
        timestamp due_date
        varchar google_event_id
        timestamp created_at
    }

    TITLE {
        uuid id PK
        varchar name
        enum grade
        varchar icon_url
        varchar color_hex
        text acquisition_condition
    }

    USER_TITLE {
        uuid id PK
        uuid user_id FK
        uuid title_id FK
        boolean is_equipped
        boolean is_displayed
        varchar negative_modifier
        timestamp acquired_at
    }

    QUEST_LOG {
        uuid id PK
        uuid user_id FK
        enum quest_type
        boolean completed
        date quest_date
    }

    ITEM {
        uuid id PK
        varchar name
        enum category
        int price
        text description
        text effect
    }

    PURCHASE {
        uuid id PK
        uuid user_id FK
        uuid item_id FK
        enum payment_method
        int amount
        timestamp purchased_at
    }

    USER_STATS {
        uuid id PK
        uuid user_id FK
        json daily_success_map
        float weekly_rate
        float monthly_rate
        float yearly_rate
        enum rating_grade
        int longest_streak
        int current_streak
    }

    PERSONA {
        uuid id PK
        uuid user_id FK
        varchar character_type
        varchar persona_name
        varchar tone
        text history
        text frequent_thought
        text status_message
        text showcase_text
        text llm_output
        timestamp updated_at
    }

    REWARD_LOG {
        uuid id PK
        uuid schedule_id FK
        uuid user_id FK
        int exp_gained
        int points_gained
        timestamp rewarded_at
    }

    CHARACTER {
        uuid id PK
        varchar name
        enum rarity
        varchar sprite_key
        boolean is_pickup
    }

    USER_CHARACTER {
        uuid id PK
        uuid user_id FK
        uuid character_id FK
        int count
        timestamp acquired_at
    }

    SUMMON_LOG {
        uuid id PK
        uuid user_id FK
        uuid character_id FK
        enum cost_type
        int pity_counter
        timestamp summoned_at
    }

    USER_SETTINGS {
        uuid id PK
        uuid user_id FK
        varchar language
        varchar timezone
        enum week_start
        enum time_format
        varchar theme
        float character_scale
        boolean gcal_sync_enabled
        json notification_prefs
        int reminder_minutes
    }
```

#### 3.4.2 자료 사전

| 데이터 항목 | 타입 | 설명 | 제약 조건 |
|-------------|------|------|-----------|
| `user.id` | UUID | 사용자 고유 식별자 | PK, NOT NULL |
| `user.email` | VARCHAR(255) | Google 계정 이메일 | UNIQUE, NOT NULL |
| `user.level` | INTEGER | 현재 레벨 | DEFAULT 1, ≥ 1 |
| `user.total_exp` | BIGINT | 누적 경험치 | DEFAULT 0, ≥ 0 |
| `user.current_points` | INTEGER | 보유 포인트 | DEFAULT 0, ≥ 0 |
| `user.account_status` | ENUM | 계정 상태 | `ACTIVE`, `DORMANT` |
| `schedule.difficulty` | ENUM | 난이도 | `LOW`, `MEDIUM`, `HIGH` |
| `schedule.status` | ENUM | 일정 상태 | `PENDING`, `COMPLETED`, `OVERDUE` |
| `title.grade` | ENUM | 칭호 등급 | `COMMON`, `RARE`, `EPIC`, `LEGENDARY` |
| `quest_log.quest_type` | ENUM | 퀘스트 유형 | `ADD_PLAN`, `COMPLETE_PLAN`, `VISIT_SHOWCASE` |
| `item.category` | ENUM | 아이템 분류 | `CUSTOMIZE`, `DEFENSE`, `PERSONA` |
| `purchase.payment_method` | ENUM | 결제 방식 | `POINTS`, `IAP` |
| `user_stats.rating_grade` `[v1.3]` | ENUM | 누적 등급 | `D`, `C`, `B`, `A`, `S` |
| `user.summon_tickets` `[v1.3]` | INTEGER | 보유 소환권 | DEFAULT 0, ≥ 0 |
| `character.rarity` `[v1.3]` | ENUM | 캐릭터 희귀도 | `COMMON`, `RARE`, `EPIC`, `LEGENDARY` |
| `summon_log.cost_type` `[v1.3]` | ENUM | 소환 비용 유형 | `POINTS`, `TICKET` |
| `user_character.count` `[v1.3]` | INTEGER | 동일 캐릭터 중복 보유 수 | ≥ 1 |
| `user_settings.language` `[v1.3]` | VARCHAR | 표시 언어 | `ko`(기본), `en`·`ja`=V2 |
| `user_settings.timezone` `[v1.3]` | VARCHAR | 시간대 | DEFAULT `Asia/Seoul` |
| `user_settings.week_start` `[v1.3]` | ENUM | 주 시작 요일 | `SUN`, `MON` |
| `user_settings.time_format` `[v1.3]` | ENUM | 시간 표기 | `H12`, `H24` |
| `user_settings.theme` `[v1.3]` | VARCHAR | 컬러 테마 | `cosmic_purple`(기본); `game_boy`·`synthwave`·`amber_crt`=V2 |
| `user_settings.character_scale` `[v1.3]` | FLOAT | 캐릭터 표시 배율 | `0.8`, `1.0`, `1.3` |

### 3.5 Design Constraints (설계 제약사항)

2.5절(설계 및 구현 제약사항)의 DC-01~DC-08을 그대로 적용한다. 추가 설계 제약은 아래와 같다.

| ID | 제약사항 | 근거 |
|----|----------|------|
| DC-09 | 모든 인증은 **Google OAuth 2.0 + JWT**를 사용한다. 자체 회원가입 미제공. | 외부 인증 위임 |
| DC-10 | 서버에 사용자 **결제 카드 정보를 직접 저장하지 않는다.** | PCI DSS 준수 |
| DC-11 | LLM 호출 시 **프롬프트 인젝션 방어** 필터를 적용한다. | 보안 |

### 3.6 Software System Attributes (소프트웨어 시스템 속성)

#### 3.6.1 Reliability (신뢰성)

| ID | 요구사항 | 목표 |
|----|----------|------|
| REL-01 | EXP·포인트·칭호 트랜잭션의 **ACID 속성**을 보장하여 데이터 손실을 방지한다. | 데이터 무결성 100% |
| REL-02 | 외부 API(Google/LLM/PG) 장애 시에도 **핵심 기능**(캘린더 조회, 기존 데이터 표시)은 정상 동작한다. | 그레이스풀 디그레이데이션 |
| REL-03 | 일일 **자동 백업** 수행, 최소 30일 보관, 분기별 복원 테스트를 실시한다. *(인프라 담당)* | RPO 24h |
| REL-04 | 모든 예외에 대해 사용자 친화적 에러 메시지 표시 및 서버 로그 기록을 수행한다. | 에러 핸들링 100% 커버리지 |

#### 3.6.2 Availability (가용성)

| ID | 요구사항 | 목표 |
|----|----------|------|
| AVL-01 | 월간 **99.5% 이상** 가용성을 보장한다 (월 최대 3.6시간 다운타임). | 99.5% uptime |
| AVL-02 | 평균 복구 시간(**MTTR**) 4시간 이내를 목표로 한다. | MTTR ≤ 4h |
| AVL-03 | **무중단 배포** (Blue-Green 또는 Rolling) 전략을 적용한다. *(인프라 담당)* | 배포 시 다운타임 0 |
| AVL-04 | 온프레미스 환경에서 Docker 기반 **수평 확장**(컨테이너 복제)을 적용한다. *(인프라 담당)* | 트래픽 급증 대응 |

#### 3.6.3 Security (보안성)

| ID | 요구사항 |
|----|----------|
| SEC-01 | OAuth 액세스·리프레시 토큰을 **암호화**하여 안전하게 저장한다. |
| SEC-02 | 모든 통신에 **HTTPS (TLS 1.2+)**를 적용한다. |
| SEC-03 | 쇼케이스에서 사용자의 상세 일정·실패율 등 **민감 데이터를 비공개** 처리한다. |
| SEC-04 | 모든 API에 **JWT 인증**을 적용하고 비인가 접근을 차단한다. |
| SEC-05 | 결제 시 **PCI DSS** 가이드라인 준수, 카드 정보 서버 미저장. |
| SEC-06 | 모든 사용자 입력에 대해 **서버 측 검증** 및 SQL Injection·XSS 방어를 적용한다. |
| SEC-07 | LLM 호출 시 **프롬프트 인젝션 방어** 및 유해 출력 필터를 적용한다. |
| SEC-08 | API 키·DB 패스워드 등은 **환경 변수 또는 Docker Secrets**로 관리한다. |

#### 3.6.4 Maintainability (유지보수성)

| ID | 요구사항 |
|----|----------|
| MNT-01 | 각 기능 모듈을 **독립적으로 배포·수정** 가능하도록 모듈화 설계한다. |
| MNT-02 | Go(golangci-lint), TS(ESLint+Prettier) **코딩 컨벤션**을 적용, CI 자동 검사. |
| MNT-03 | 핵심 비즈니스 로직에 대해 **단위 테스트**를 작성하고 CI/CD에서 자동 실행한다. |
| MNT-04 | DB 스키마 변경 시 **마이그레이션 스크립트**를 사용, 버전 관리·롤백을 보장한다. |
| MNT-05 | 외부 패키지 의존성을 정기적으로 업데이트, **보안 취약점을 모니터링**한다. |
| MNT-06 | **구조화된 로그**(JSON) + Grafana/Prometheus 대시보드로 시스템 상태를 상시 파악한다. |

#### 3.6.5 Portability (이식성)

| ID | 요구사항 |
|----|----------|
| POR-01 | Chrome, Safari, Firefox, Edge 최신 2개 버전에서 **동일한 UX**를 제공한다. |
| POR-02 | 데스크톱(Windows, macOS) 및 모바일(iOS, Android) **브라우저에서 동작**한다. |
| POR-03 | **PWA**로 모바일 홈 화면 설치와 오프라인 기본 기능을 지원한다. |
| POR-04 | **Docker** 기반 컨테이너화로 개발·스테이징·프로덕션 환경 간 이식성을 보장한다. |

---

## Appendix A: 용어 정의

| 용어 | 정의 |
|------|------|
| EXP (경험치) | 일정 완료·퀘스트 달성 시 획득하는 성장 수치. 레벨업의 기준 |
| 포인트 | 상점에서 아이템 구매에 사용되는 인앱 재화 |
| 칭호 | 특정 조건 달성 시 부여되는 명예 표식. 장착용/전시용으로 분리 |
| 쇼케이스 | 캐릭터·칭호·잔디 그래프·등급을 타인에게 노출하는 소셜 프로필 |
| 페르소나 시스템 | LLM이 캐릭터 성격·칭호 이력을 분석하여 말투를 변환하는 기능 |
| 잔디 그래프 | GitHub Contribution Graph 형태의 일일 성공 시각화 차트 |
| 일일 퀘스트 | 매일 제공되는 고정 미션 3종 |
| 휴면 계정 | 14일 이상 미접속 시 전환되는 계정 상태 |
| 등급 하락 방어권 | 칭호 강등을 1회 방어하는 소비 아이템 |
| 소환 (가챠) `[v1.3]` | 포인트·소환권으로 캐릭터를 확률 획득하는 시스템 |
| 도감 `[v1.3]` | 획득한 캐릭터 컬렉션. 보유 캐릭터 중 1개만 활성 장착(펫 육성 기능 없음) |
| 천장 (Pity) `[v1.3]` | 일정 횟수 연속 미획득 시 최고 등급(LEGENDARY)을 확정 지급하는 보장 장치 |
| 소환권 `[v1.3]` | 소환 1회에 사용하는 소비 재화 |
| 등급 (Rating) `[v1.3]` | 누적 성공률 기반 5단계(D·C·B·A·S) 평가 |
| 스트릭 (Streak) `[v1.3]` | 연속 성공(완료) 일수 |

## Appendix B: 약어 목록

| 약어 | 정의 |
|------|------|
| SRS | Software Requirements Specification |
| OAuth | Open Authorization |
| IAP | In-App Purchase |
| PG | Payment Gateway |
| LLM | Large Language Model |
| PWA | Progressive Web Application |
| API | Application Programming Interface |
| JWT | JSON Web Token |
| CRUD | Create, Read, Update, Delete |
| FCM | Firebase Cloud Messaging |
| ERD | Entity-Relationship Diagram |
| CI/CD | Continuous Integration / Continuous Deployment |
| MTTR | Mean Time To Recovery |
| RPO | Recovery Point Objective |
| LCP | Largest Contentful Paint |

## Appendix C: 칭호 목록 (8종) `[v1.3]`

> 와이어프레임 05·06 화면(페르소나·칭호 메인/설정)에 노출된다. FR-TITLE-01의 부여 대상이며, 조건은 v1.3에서 선정한 값을 v1.4에서도 유지한다. **구현 시 SSoT(`api_and_rules.md`)와 `backend/internal/game/engine.go`를 본 표에 맞춰 동기화해야 한다.**

| # | 칭호 | 등급 | 색상 | 획득 조건 |
|:-:|------|------|------|-----------|
| 1 | 첫 발걸음 | COMMON | `#06D6A0` | 첫 일정 1개 완료 |
| 2 | 꾸준러 | RARE | `#8B5CF6` | 7일 연속 일정 완료 |
| 3 | 새벽의 개척자 | RARE | `#8B5CF6` | 오전 6시 이전 일정 완료 누적 10회 |
| 4 | 난관 돌파자 | EPIC | `#FFD700` | 난이도 HIGH 일정 누적 20개 완료 |
| 5 | 불굴의 의지 | EPIC | `#FFD700` | 30일 연속 스트릭 달성 |
| 6 | 시간의 지배자 | LEGENDARY | `#FF6B6B` | 100일 무결점 스트릭 달성 |
| 7 | 게으른 소환사 | COMMON | `#8B949E` | (부정) 기한 초과(OVERDUE) 누적 5회 — 강등·수식어 계열 |
| 8 | 전설의 수집가 | LEGENDARY | `#FFD700` | (히든) 도감에 LEGENDARY 캐릭터 1종 이상 보유 |

> 페널티 수식어("게으른")는 장착 칭호 앞에 부착되며, 정상 일정 완료 또는 방어권으로만 복구 가능하다(FR-TITLE-03/04, DC-07).

## Appendix D: 스킨 뽑기 확률·천장 `[v1.4]`

> FR-SUMMON-02/03 요약. 와이어프레임 07 화면에 노출되는 확률표와 정합한다. 픽업 배너 적용 시 해당 LEGENDARY 확률 2배.

| 등급 | 기본 확률 | 비고 |
|------|---------:|------|
| LEGENDARY | 3% | 천장 90회 시 확정 |
| EPIC | 9% | |
| RARE | 28% | 10연챠 시 1개 이상 확정 |
| COMMON | 60% | |

- 단챠 100P / 10연챠 900P (포인트 또는 뽑기권)
- 천장: 90회 연속 LEGENDARY 미획득 시 다음 뽑기에서 확정
- 중복 획득 시 등급별 포인트 환급 (COMMON 10 / RARE 30 / EPIC 80 / LEGENDARY 200)

---

> **문서 끝**  
> 본 문서의 변경 이력은 Git 커밋 히스토리를 통해 관리됩니다.
