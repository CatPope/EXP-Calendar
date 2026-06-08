# EXP Calendar

게이미피케이션 기반 일정 관리 시스템 (SRS v1.4 기준).
Google Calendar 연동을 통한 일정 관리에 EXP / 포인트 / 칭호 보상,
LLM 페르소나 텍스트 변환, 소셜 쇼케이스를 결합한 PWA이다.
프론트엔드는 Next.js 14(React), 백엔드는 Go(Gin), 저장소는 PostgreSQL(pgvector) 단일 인스턴스로 구성한다.
온프레미스 Docker Compose 환경에서 단일 명령으로 전체 스택을 기동할 수 있다.

## 아키텍처

```mermaid
flowchart LR
    User[사용자 브라우저 / PWA]

    subgraph Compose [docker compose]
        FE[frontend<br/>Next.js 14<br/>:3000]
        BE[backend<br/>Go + Gin<br/>:8080]
        DB[(db<br/>pgvector:pg15<br/>:5432)]
        NG[nginx<br/>profile: prod<br/>:80]
    end

    subgraph External [외부 서비스]
        GAuth[Google OAuth 2.0]
        GCal[Google Calendar API]
        GEM[Google Gemini API]
        Push[FCM / Web Push]
    end

    User -- HTTPS --> NG
    NG -- "/" --> FE
    NG -- "/api/" --> BE
    User -- ":3000 (dev)" --> FE
    FE -- "REST :8080" --> BE
    BE -- SQL --> DB
    BE --> GAuth
    BE --> GCal
    BE --> GEM
    BE --> Push
```

## 요구 사양

- Docker Desktop (Windows / macOS) 또는 Docker Engine + Compose v2 (Linux)
- 호스트의 다음 포트가 비어 있어야 함
  - `3000` (frontend)
  - `8080` (backend)
  - `5432` (db, 외부 노출 — 개발 편의)
  - `80` (nginx, `prod` 프로필 사용 시에만)
- 디스크 여유 약 2 GB, 메모리 4 GB 이상 권장

## 빠른 시작 (Quick Start)

```powershell
# 1. .env 준비
Copy-Item .env.example .env

# 2. (선택) Google OAuth / Gemini API 키 입력. 없으면 dev-login 으로 진행 가능
notepad .env

# 3. 빌드 + 실행
docker compose up -d --build
```

접속:

- 프론트엔드: <http://localhost:3000>
- 백엔드 헬스체크: <http://localhost:8080/health>
- (옵션) nginx 프록시: <http://localhost> — `.env`에서 `NEXT_PUBLIC_APP_MODE=prod`로 바꾼 뒤 `docker compose --profile prod up -d --build`

## 개발용 로그인 흐름

### Google OAuth 미설정 시 (기본)

- `.env`에서 `DEV_MODE=true`(백엔드), `NEXT_PUBLIC_APP_MODE=dev`(프론트) 가 켜져 있는 상태이다.
- 랜딩 페이지의 **"개발용 로그인"** 폼에 임의의 이메일과 표시 이름을 입력하면 즉시 가입/로그인되어 캘린더로 진입한다.
- 내부적으로 `POST /api/auth/dev-login` 을 호출한다.

### Google OAuth 사용 시

1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → **OAuth 2.0 Client ID** 생성.
2. 애플리케이션 유형: **웹 애플리케이션**.
3. **승인된 JavaScript 출처** 에 `http://localhost:3000` 추가.
4. **승인된 리디렉션 URI** 에 `http://localhost:3000` (또는 별도 콜백 경로 사용 시 그 경로) 추가.
5. 발급된 **Client ID** 를 `.env` 의 다음 **두 변수에 동일하게** 입력한다.
   - `GOOGLE_OAUTH_CLIENT_ID` (백엔드)
   - `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` (프론트엔드)
6. `docker compose up -d --build` 로 재기동하면 랜딩 페이지의 "Google 로그인" 버튼이 활성화된다.

## LLM 페르소나 키 설정

- `.env` 의 `GEMINI_API_KEY` 에 키를 입력하면 페르소나 페이지에서 **실제 Google Gemini API**(`generativelanguage.googleapis.com/v1beta`) 를 호출한다.
- 비워두거나 5xx/네트워크 실패 시 백엔드가 **결정적(mock) 응답**으로 폴백한다. 기능 시연 및 자동 테스트는 mock 만으로도 가능하다.
- 사용 모델은 `LLM_MODEL` (기본값 `gemini-2.0-flash`, docker-compose는 `gemini-2.5-flash` 로 오버라이드) 로 조절한다.

## 주요 명령

```powershell
# 로그 추적
docker compose logs -f backend
docker compose logs -f frontend

# 컨테이너만 종료 (DB 데이터 보존)
docker compose down

# 컨테이너 + DB 볼륨까지 모두 제거 (완전 초기화)
docker compose down -v

# 코드 변경 후 재빌드
docker compose up -d --build

# 프로덕션 프로필 (nginx 포함 — 외부 호스트/터널 도메인 자동 대응)
# .env 에서 NEXT_PUBLIC_APP_MODE=prod 로 바꾼 뒤 빌드한다.
# 프론트 코드가 APP_MODE=prod 시 API base 를 빈 값으로 파생하여 같은 오리진 /api 경유로 호출한다.
docker compose --profile prod up -d --build
```

## 개별 실행 (Docker 없이)

각 컴포넌트를 호스트에서 직접 실행하고 싶을 때 사용한다.

### 1. DB만 Docker 로

```powershell
docker compose up -d db
```

### 2. Backend (호스트)

```powershell
cd backend
# DATABASE_URL의 호스트를 'db' 대신 'localhost'로 바꿔서 전달한다.
$env:DATABASE_URL = "postgres://exp:exp@localhost:5432/expcalendar?sslmode=disable"
$env:JWT_SECRET   = "change-me-dev-only"
$env:DEV_MODE     = "true"
go run ./cmd/server
```

### 3. Frontend (호스트)

```powershell
cd frontend
npm install
npm run dev
```

접속: <http://localhost:3000>

## DB 접속

```powershell
# psql 진입
docker compose exec db psql -U exp -d expcalendar

# 한 줄 쿼리
docker compose exec db psql -U exp -d expcalendar -c "select count(*) from users;"
```

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------|
| 포트 충돌 (3000 / 8080 / 5432) | `netstat -ano \| findstr :3000` 으로 점유 프로세스 확인 후 종료. 또는 `docker-compose.yml` 의 ports 매핑을 변경. |
| 빌드 실패 | `docker compose build --no-cache backend` (또는 `frontend`) 로 캐시 무시하고 재빌드. |
| DB 마이그레이션이 안 보임 | `docker compose down -v && docker compose up -d --build` 로 볼륨까지 초기화. |
| frontend 가 backend 를 못 찾음 (CORS) | 브라우저 콘솔의 CORS 에러 확인 → backend 의 `ALLOWED_ORIGINS` 가 `http://localhost:3000` 을 포함하는지 점검. |
| `dev-login` 폼이 안 보임 | `.env` 의 `NEXT_PUBLIC_APP_MODE=dev` 확인 + frontend 재빌드 (`NEXT_PUBLIC_*` 는 빌드 시 주입됨). |
| Windows 에서 빌드가 매우 느림 | Docker Desktop 의 WSL2 백엔드 사용, 그리고 가능하면 프로젝트를 WSL 파일시스템(`\\wsl$\...`) 에 둔다. |

## 구현 범위 (MVP)

본 저장소는 SRS v1.4 의 다음 범위를 MVP 로 구현한다.

- **Part A (인증)**: dev-login + Google OAuth(선택) + JWT access/refresh.
- **Part B (게임 엔진)**: 일정 완료에 따른 EXP / 포인트 산정, 레벨업.
- **Part C (칭호)**: **기본 자동 부여**만. 수동 큐레이션 / 희귀도 정렬 등은 후속.
- **Part D (상점)**: 무료 재화 기반 인앱 상점, 포인트 차감 / 보유 확인.
- **Part E (캘린더)**: 일정 CRUD, 난이도, 완료 처리. Google Calendar 단방향 가져오기.
- **Part F (Push)**: 스켈레톤만. FCM/Web Push 발송 파이프라인은 미완.
- **Part G (페르소나)**: LLM 호출 또는 결정적 mock 텍스트 변환.
- **Part H (쇼케이스)**: 본인/타인 프로필, 보유 칭호 / 레벨 / 최근 활동 노출.
- **Part I (휴면 / 복귀)**: **미구현**.
- **Part J (고급 분석 / 추천)**: **미구현**.

## 테스트 시나리오 (수동)

다음 흐름으로 한 바퀴 도는 것이 데모/QA 의 기본 경로이다.

1. 랜딩 페이지 진입 → **"개발용 로그인"** (또는 Google 로그인) → 캘린더 화면 진입.
2. 일정 추가 (난이도 **MEDIUM**) → 완료 처리 → HUD 의 **EXP / Points** 가 증가하는지 확인.
3. EXP 누적으로 **레벨업 토스트** 가 뜨고, 조건 충족 시 **칭호 자동 부여** 가 발생하는지 확인.
4. **상점** 진입 → 아이템 구매 → 포인트가 차감되고 보유 목록에 들어오는지 확인.
5. **페르소나** 페이지에서 임의 텍스트 입력 → 변환 결과 확인 (키 없으면 mock 응답).
6. **쇼케이스** 페이지에서 본인 프로필 / 타인 프로필 (URL 의 유저 ID 변경) 열람.

## 폴더 구조

```
EXP-Calendar/
├─ backend/                 # Go (Gin) API 서버 — 다른 agent 가 관리
├─ frontend/                # Next.js 14 PWA — 다른 agent 가 관리
├─ nginx/
│  └─ nginx.conf            # prod 프로필용 리버스 프록시 설정
├─ docs/
│  └─ for_ai/spec/api_and_rules.md   # SSoT 명세서
├─ docker-compose.yml
├─ .env.example
├─ .dockerignore
├─ .gitignore
├─ CLAUDE.md
└─ README.md
```
