# EXP Calendar — UML 모델링 명세서

> **팀명**: 백정신세  
> **팀원**: 정다우, 신강민, 백인서  
> **프로젝트명**: EXP Calendar — 게이미피케이션 기반 일정 관리 시스템  
> **작성일**: 2026-04-20  

---

## 목차

1. [유스케이스 다이어그램 (Use Case Diagram)](#1-유스케이스-다이어그램-use-case-diagram)
2. [클래스 다이어그램 (Class Diagram)](#2-클래스-다이어그램-class-diagram)
3. [순차 다이어그램 (Sequence Diagram)](#3-순차-다이어그램-sequence-diagram)
4. [상태 다이어그램 (State Diagram)](#4-상태-다이어그램-state-diagram)

---

## 1. 유스케이스 다이어그램 (Use Case Diagram)

### 1.1 시스템 개요

EXP Calendar는 Google Calendar 연동 기반의 게이미피케이션 일정 관리 시스템으로, 사용자의 일정 완료에 대해 EXP·포인트·칭호를 보상하고, LLM 기반 캐릭터 페르소나와 소셜 쇼케이스를 제공한다.

### 1.2 액터 정의

| 액터 | 유형 | 설명 |
|------|------|------|
| **일반 사용자** | 주 액터 | 일정 관리, 퀘스트 수행, 상점 이용 등 모든 기능을 사용하는 사용자 |
| **열람자** | 주 액터 | 타 사용자의 쇼케이스만 열람하는 비주력 사용자 |
| **Google OAuth** | 보조 액터 | 사용자 인증 및 토큰 발급을 처리하는 외부 인증 서비스 |
| **Google Calendar API** | 보조 액터 | 외부 일정 데이터를 제공하는 캘린더 서비스 |
| **LLM API** | 보조 액터 | 캐릭터 성격 기반 텍스트 변환을 수행하는 AI 서비스 |
| **PG사 API** | 보조 액터 | 유료 결제 처리를 담당하는 결제 게이트웨이 |
| **FCM / Web Push** | 보조 액터 | Push 알림 발송을 담당하는 메시징 서비스 |
| **시스템 타이머** | 보조 액터 | 휴면 전환, 일일 퀘스트 초기화 등 스케줄 기반 작업 수행 |

### 1.3 유스케이스 다이어그램

```mermaid
flowchart LR
    subgraph Actors_Left [" "]
        User(["일반 사용자"])
        Viewer(["열람자"])
    end

    subgraph System ["EXP Calendar 시스템"]
        UC1["UC-01\nGoogle 로그인"]
        UC2["UC-02\n성향 설문 응답"]
        UC3["UC-03\n일정 조회"]
        UC4["UC-04\n일정 등록/수정/삭제"]
        UC5["UC-05\n일정 완료 처리"]
        UC6["UC-06\n일일 퀘스트 확인 및 달성"]
        UC7["UC-07\nEXP/포인트 획득"]
        UC8["UC-08\n칭호 획득/장착/전시 설정"]
        UC9["UC-09\n상점 아이템 조회 및 구매"]
        UC10["UC-10\n유료 결제 (IAP)"]
        UC11["UC-11\n쇼케이스 조회"]
        UC12["UC-12\n페르소나 텍스트 변환"]
        UC13["UC-13\n통계/잔디 그래프 조회"]
        UC14["UC-14\n알림 수신 설정"]
        UC15["UC-15\n휴면 전환 처리"]
        UC16["UC-16\n휴면 복귀"]
    end

    subgraph Actors_Right [" "]
        GoogleAuth(["Google OAuth"])
        GCalAPI(["Google Calendar API"])
        LLMAPI(["LLM API"])
        PGAPI(["PG사 API"])
        FCM(["FCM / Web Push"])
        Timer(["시스템 타이머"])
    end

    User --- UC1
    User --- UC2
    User --- UC3
    User --- UC4
    User --- UC5
    User --- UC6
    User --- UC8
    User --- UC9
    User --- UC11
    User --- UC12
    User --- UC13
    User --- UC14
    User --- UC16

    Viewer --- UC11

    UC1 --- GoogleAuth
    UC3 --- GCalAPI
    UC4 --- GCalAPI
    UC12 --- LLMAPI
    UC10 --- PGAPI
    UC14 --- FCM
    UC15 --- Timer
```

### 1.4 유스케이스 관계

| 관계 유형 | 기본 유스케이스 | 관련 유스케이스 | 설명 |
|-----------|----------------|----------------|------|
| **Include** | UC-01 Google 로그인 | UC-02 성향 설문 응답 | 최초 로그인 시 반드시 성향 설문을 수행한다 |
| **Include** | UC-05 일정 완료 처리 | UC-07 EXP/포인트 획득 | 일정 완료 시 보상이 반드시 지급된다 |
| **Include** | UC-16 휴면 복귀 | UC-02 성향 설문 응답 | 복귀 시 설문을 재실행한다 |
| **Extend** | UC-07 EXP/포인트 획득 | UC-08 칭호 획득 | 레벨업 시 칭호 조건을 검사하여 부여한다 |
| **Extend** | UC-09 상점 아이템 구매 | UC-10 유료 결제 (IAP) | 포인트 부족 시 유료 결제로 확장된다 |
| **Extend** | UC-05 일정 완료 처리 | UC-06 일일 퀘스트 달성 | 완료 시 퀘스트 조건 충족 여부를 검사한다 |
| **Extend** | UC-15 휴면 전환 처리 | UC-14 알림 수신 | 13일차에 경고 알림을 발송한다 |

### 1.5 유스케이스 명세 (주요 항목)

#### UC-05: 일정 완료 처리

| 항목 | 내용 |
|------|------|
| **유스케이스 ID** | UC-05 |
| **유스케이스명** | 일정 완료 처리 |
| **액터** | 일반 사용자 |
| **사전 조건** | 사용자가 로그인 상태이며, 완료할 일정이 존재한다 |
| **기본 흐름** | 1. 사용자가 일정을 선택한다<br>2. 완료 버튼을 클릭한다<br>3. 시스템이 일정 상태를 COMPLETED로 변경한다<br>4. 시스템이 난이도에 따라 EXP/포인트를 산출한다<br>5. 일일 한도를 확인하여 보상을 지급한다<br>6. 레벨업 조건 확인 후 칭호 검사를 수행한다<br>7. 일일 퀘스트 달성 여부를 갱신한다 |
| **대안 흐름** | 5a. 일일 한도 초과 시 잔여분만 지급한다 |
| **사후 조건** | 일정 상태가 COMPLETED로 변경되고, EXP/포인트가 지급된다 |

---

## 2. 클래스 다이어그램 (Class Diagram)

### 2.1 설계 방침

SRS의 논리적 데이터베이스 요구사항(3.4절)과 기능적 요구사항(3.2절)을 기반으로 핵심 도메인 클래스를 도출하였다. 각 클래스의 속성에는 가시성(+public, -private, #protected)을 표기하고, 클래스 간 다중도(multiplicity)와 관계 유형을 명시한다.

### 2.2 클래스 다이어그램

```mermaid
classDiagram
    class User {
        -UUID id
        -String email
        -String displayName
        -int level
        -long totalExp
        -int currentPoints
        -int dailyPointsEarned
        -AccountStatus accountStatus
        -DateTime lastLoginAt
        -DateTime createdAt
        +login(oauthToken: String): JWT
        +completeSchedule(scheduleId: UUID): RewardLog
        +checkDormancy(): void
        +returnFromDormancy(): void
        +equipTitle(titleId: UUID): void
        +purchaseItem(itemId: UUID): Purchase
    }

    class Schedule {
        -UUID id
        -UUID userId
        -String title
        -String description
        -Difficulty difficulty
        -ScheduleStatus status
        -DateTime dueDate
        -String googleEventId
        -DateTime createdAt
        +complete(): RewardLog
        +updateDifficulty(): void
        +syncWithGoogle(): void
        +checkOverdue(): boolean
    }

    class Title {
        -UUID id
        -String name
        -TitleGrade grade
        -String iconUrl
        -String colorHex
        -String acquisitionCondition
        +checkCondition(user: User): boolean
    }

    class UserTitle {
        -UUID id
        -UUID userId
        -UUID titleId
        -boolean isEquipped
        -boolean isDisplayed
        -String negativeModifier
        -DateTime acquiredAt
        +equip(): void
        +display(): void
        +applyPenalty(modifier: String): void
        +removePenalty(): void
    }

    class QuestLog {
        -UUID id
        -UUID userId
        -QuestType questType
        -boolean completed
        -Date questDate
        +markCompleted(): void
        +checkDailyProgress(): int
    }

    class Item {
        -UUID id
        -String name
        -ItemCategory category
        -int price
        -String description
        -String effect
        +applyEffect(user: User): void
    }

    class Purchase {
        -UUID id
        -UUID userId
        -UUID itemId
        -PaymentMethod paymentMethod
        -int amount
        -DateTime purchasedAt
        +processPayment(): boolean
        +refund(): boolean
    }

    class UserStats {
        -UUID id
        -UUID userId
        -Map dailySuccessMap
        -float weeklyRate
        -float monthlyRate
        -float yearlyRate
        -RatingGrade ratingGrade
        +updateStats(): void
        +calculateRating(): RatingGrade
        +generateGrassGraph(): Map
    }

    class Persona {
        -UUID id
        -UUID userId
        -String characterType
        -String showcaseText
        -String llmOutput
        -DateTime updatedAt
        +transformText(input: String): String
        +updateCharacter(type: String): void
    }

    class RewardLog {
        -UUID id
        -UUID scheduleId
        -UUID userId
        -int expGained
        -int pointsGained
        -DateTime rewardedAt
        +calculateReward(difficulty: Difficulty): void
        +applyDailyLimit(earned: int, limit: int): int
    }

    class GamificationEngine {
        -int dailyExpLimit
        -float lowLevelBonus
        +processCompletion(user: User, schedule: Schedule): RewardLog
        +checkLevelUp(user: User): boolean
        +checkTitleConditions(user: User): List~Title~
        +applyPenalty(user: User, title: UserTitle): void
        +processDailyQuests(user: User): List~QuestLog~
    }

    class AuthService {
        +loginWithGoogle(oauthCode: String): JWT
        +refreshToken(refreshToken: String): JWT
        +validateToken(token: String): boolean
    }

    class NotificationService {
        +sendPush(userId: UUID, message: String): void
        +sendDormancyWarning(userId: UUID): void
        +scheduleReminder(scheduleId: UUID, minutesBefore: int): void
    }

    User "1" --> "0..*" Schedule : creates
    User "1" --> "0..*" UserTitle : earns
    User "1" --> "0..*" QuestLog : completes
    User "1" --> "0..*" Purchase : makes
    User "1" --> "0..*" RewardLog : receives
    User "1" --> "1" UserStats : has
    User "1" --> "0..1" Persona : configures

    Title "1" --> "0..*" UserTitle : assigned_to
    Schedule "1" --> "0..1" RewardLog : generates
    Item "1" --> "0..*" Purchase : purchased_in

    GamificationEngine ..> User : processes
    GamificationEngine ..> Schedule : evaluates
    GamificationEngine ..> RewardLog : creates
    GamificationEngine ..> Title : checks

    AuthService ..> User : authenticates
    NotificationService ..> User : notifies
```

### 2.3 열거형 정의

| 열거형 | 값 | 설명 |
|--------|-----|------|
| **AccountStatus** | `ACTIVE`, `DORMANT` | 계정 활성/휴면 상태 |
| **Difficulty** | `LOW`, `MEDIUM`, `HIGH` | 일정 난이도 |
| **ScheduleStatus** | `PENDING`, `COMPLETED`, `OVERDUE` | 일정 진행 상태 |
| **TitleGrade** | `COMMON`, `RARE`, `EPIC`, `LEGENDARY` | 칭호 등급 |
| **QuestType** | `ADD_PLAN`, `COMPLETE_PLAN`, `VISIT_SHOWCASE` | 일일 퀘스트 유형 |
| **ItemCategory** | `CUSTOMIZE`, `DEFENSE`, `PERSONA` | 상점 아이템 분류 |
| **PaymentMethod** | `POINTS`, `IAP` | 결제 방식 |
| **RatingGrade** | S, A, B, C, D, F | 사용자 활동 등급 |

---

## 3. 순차 다이어그램 (Sequence Diagram)

### 3.1 시나리오: 일정 완료 및 보상 지급

사용자가 일정을 완료하면, 난이도에 따라 EXP/포인트가 산출되고, 일일 한도 확인 후 보상이 지급되며, 레벨업 시 칭호 조건을 검사하는 핵심 프로세스이다.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Client as Client (PWA)
    participant CalSvc as Calendar Service
    participant GameEngine as Gamification Engine
    participant DB as PostgreSQL
    participant NotiSvc as Notification Service
    participant FCM as FCM / Web Push

    User ->> Client: 일정 완료 버튼 클릭
    Client ->> CalSvc: PUT /api/schedules/{id}/complete (JWT)
    
    CalSvc ->> DB: 일정 상태 조회
    DB -->> CalSvc: Schedule (status: PENDING)
    
    CalSvc ->> CalSvc: 상태를 COMPLETED로 변경
    CalSvc ->> DB: UPDATE schedule SET status = 'COMPLETED'
    DB -->> CalSvc: OK
    
    CalSvc ->> GameEngine: processCompletion(user, schedule)
    
    GameEngine ->> DB: 사용자 정보 조회 (level, dailyPointsEarned)
    DB -->> GameEngine: User 데이터
    
    GameEngine ->> GameEngine: 난이도별 EXP 산출
    Note right of GameEngine: HIGH → ×1.5<br>MEDIUM → ×1.0<br>LOW → ×0.7
    
    GameEngine ->> GameEngine: 저레벨 가중치 적용
    
    alt 일일 한도 미초과
        GameEngine ->> GameEngine: 전액 지급
    else 일일 한도 초과
        GameEngine ->> GameEngine: 잔여분만 지급
    end
    
    GameEngine ->> DB: INSERT reward_log / UPDATE user (exp, points)
    DB -->> GameEngine: OK
    
    GameEngine ->> GameEngine: 레벨업 여부 확인
    
    alt 레벨업 달성
        GameEngine ->> DB: UPDATE user SET level = level + 1
        DB -->> GameEngine: OK
        
        GameEngine ->> DB: 칭호 조건 조회
        DB -->> GameEngine: Title 목록
        
        alt 칭호 조건 충족
            GameEngine ->> DB: INSERT user_title
            DB -->> GameEngine: OK
            GameEngine ->> NotiSvc: 칭호 획득 알림 요청
            NotiSvc ->> FCM: Push 알림 발송
            FCM -->> User: "새로운 칭호를 획득했습니다!"
        end
    end
    
    GameEngine ->> DB: 일일 퀘스트 (COMPLETE_PLAN) 갱신
    DB -->> GameEngine: OK
    
    GameEngine -->> CalSvc: RewardLog 반환
    CalSvc -->> Client: 200 OK (보상 결과)
    Client -->> User: 보상 애니메이션 + 결과 표시
```

### 3.2 시나리오: Google 로그인 및 일정 동기화

```mermaid
sequenceDiagram
    actor User as 사용자
    participant Client as Client (PWA)
    participant AuthSvc as Auth Service
    participant GoogleAuth as Google OAuth 2.0
    participant CalSvc as Calendar Service
    participant GCalAPI as Google Calendar API
    participant DB as PostgreSQL

    User ->> Client: Google 로그인 버튼 클릭
    Client ->> GoogleAuth: OAuth 인증 요청 (redirect)
    GoogleAuth -->> User: Google 로그인 화면
    User ->> GoogleAuth: 자격 증명 입력 + 동의
    GoogleAuth -->> Client: Authorization Code

    Client ->> AuthSvc: POST /api/auth/google (code)
    AuthSvc ->> GoogleAuth: Authorization Code → Token 교환
    GoogleAuth -->> AuthSvc: Access Token + Refresh Token

    AuthSvc ->> DB: 사용자 조회/생성
    DB -->> AuthSvc: User 데이터

    alt 최초 가입
        AuthSvc ->> DB: INSERT user
        DB -->> AuthSvc: OK
        AuthSvc -->> Client: JWT + needSurvey: true
        Client -->> User: 성향 설문 화면으로 이동
    else 기존 사용자
        AuthSvc ->> DB: UPDATE lastLoginAt
        DB -->> AuthSvc: OK
        AuthSvc -->> Client: JWT + needSurvey: false
    end

    Client ->> CalSvc: GET /api/schedules/sync (JWT)
    CalSvc ->> GCalAPI: GET events (Access Token)
    GCalAPI -->> CalSvc: 일정 이벤트 목록
    CalSvc ->> DB: UPSERT schedules
    DB -->> CalSvc: OK
    CalSvc -->> Client: 동기화된 일정 목록
    Client -->> User: 캘린더 뷰 렌더링
```

---

## 4. 상태 다이어그램 (State Diagram)

### 4.1 대상 객체: 사용자 계정 (User Account)

사용자 계정은 생성부터 활성, 휴면, 복귀까지의 상태 전이를 거친다. 14일 미접속 시 자동 휴면 전환되며, 복귀 시 보상 패키지와 함께 재활성화된다.

```mermaid
stateDiagram-v2
    [*] --> 회원가입

    회원가입 --> 성향설문: 최초 Google 로그인 성공

    성향설문 --> 활성: 설문 완료 / 초기 레벨·난이도 설정

    state 활성 {
        [*] --> 정상활동
        
        정상활동 --> 일정수행중: 일정 선택
        일정수행중 --> 보상처리: 일정 완료
        보상처리 --> 레벨업검사: EXP/포인트 지급
        레벨업검사 --> 정상활동: 레벨업 미달성
        레벨업검사 --> 칭호검사: 레벨업 달성
        칭호검사 --> 정상활동: 칭호 부여 또는 미해당

        정상활동 --> 퀘스트수행: 일일 퀘스트 시작
        퀘스트수행 --> 정상활동: 퀘스트 완료/미완료

        정상활동 --> 상점이용: 상점 진입
        상점이용 --> 정상활동: 구매 완료/취소
    }

    활성 --> 미접속경고: 13일 연속 미접속 / 경고 알림 발송
    미접속경고 --> 활성: 재접속

    미접속경고 --> 휴면: 14일 연속 미접속 / 자동 휴면 전환

    state 휴면 {
        [*] --> 휴면대기
        휴면대기 --> 복귀시도: 재접속
    }

    휴면 --> 복귀처리: 재접속 감지

    state 복귀처리 {
        [*] --> 성향설문재실행
        성향설문재실행 --> 복귀보상지급: 설문 완료
        
        state 복귀보상지급 {
            [*] --> 포인트대량지급
            포인트대량지급 --> EXP버프활성화: 14일치 이상 포인트 지급
            EXP버프활성화 --> 방어권지급: 7일간 1.5배 EXP 버프 설정
            방어권지급 --> [*]: 등급 하락 방어권 3개 지급 (최초 복귀 시)
        }
    }

    복귀처리 --> 활성: 복귀 보상 완료 / 계정 상태 ACTIVE로 변경
```

### 4.2 대상 객체: 일정 (Schedule)

일정은 생성부터 완료 또는 기한 초과까지의 상태 전이를 거친다.

```mermaid
stateDiagram-v2
    [*] --> 대기중: 일정 생성 (수동 등록 or Google Calendar 동기화)

    대기중 --> 완료: 사용자가 완료 처리 / EXP·포인트 지급
    대기중 --> 기한초과: dueDate 경과 / 칭호 페널티 검사
    대기중 --> 대기중: 일정 수정 (제목, 날짜, 난이도 변경)

    기한초과 --> 완료: 뒤늦게 완료 처리 / 감소된 보상 지급
    기한초과 --> 칭호페널티적용: 페널티 조건 충족 / 칭호 강등 + 부정적 수식어 부착

    칭호페널티적용 --> 기한초과: 페널티 적용 완료

    완료 --> [*]

    note right of 대기중: status = PENDING
    note right of 완료: status = COMPLETED
    note right of 기한초과: status = OVERDUE
```

### 4.3 대상 객체: 칭호 (UserTitle)

사용자가 보유한 칭호의 상태 전이를 나타낸다.

```mermaid
stateDiagram-v2
    [*] --> 획득: 칭호 조건 충족 / 알림 발송

    획득 --> 미장착: 기본 상태

    미장착 --> 장착중: 사용자가 장착 선택
    장착중 --> 미장착: 다른 칭호로 교체

    미장착 --> 전시중: 쇼케이스 전시 선택
    전시중 --> 미장착: 전시 해제

    장착중 --> 페널티부착: 일정 지연 감지 / 자동 강등 + 부정적 수식어
    페널티부착 --> 장착중: 정상 일정 완료 or 방어 아이템 사용 / 수식어 제거

    note right of 장착중: isEquipped = true
    note right of 전시중: isDisplayed = true
    note left of 페널티부착: negativeModifier ≠ null
```

---

## 부록: 다이어그램 요약

| # | 다이어그램 | 모델링 대상 | 설명 |
|---|-----------|------------|------|
| 1 | 유스케이스 다이어그램 | 시스템 전체 | 7개 액터, 16개 유스케이스, Include/Extend 관계 정의 |
| 2 | 클래스 다이어그램 | 도메인 모델 | 13개 클래스, 속성·메서드·가시성·다중도·관계 명시 |
| 3 | 순차 다이어그램 | 일정 완료 보상 / 로그인 동기화 | 2개 시나리오의 객체 간 메시지 흐름 |
| 4 | 상태 다이어그램 | User, Schedule, UserTitle | 3개 객체의 상태 전이 설계 |

---

> **참고 문서**: `docs/planning/requirements_ieee830.md` (EXP Calendar SRS v1.0)
