# Integration Tests

요구사항서(SRS v1.4, IEEE 830) 기반 인테그레이션 테스트 스위트.

- 실제 백엔드 + DB 컨테이너에 HTTP로 hit
- 단위테스트(`backend/internal/game/...`)와는 별개로, 핸들러·트랜잭션·DB 통합 검증
- 각 테스트 케이스는 **FR-* 요구사항 ID와 1:1 매핑** (테스트 함수명 `TestFR_<카테고리>_<번호>_*`)

## 실행

루트 디렉토리에서:

```powershell
# 1) 격리된 테스트 스택 기동 (별도 포트, ephemeral DB)
docker compose -f docker-compose.test.yml up -d --build

# 2) 테스트 실행
docker compose -f docker-compose.test.yml exec test-runner sh -c 'cd /work && go test ./integration/... -v -count=1'

# 3) 정리
docker compose -f docker-compose.test.yml down -v
```

또는 host에 Go 1.22+ 설치돼 있으면 직접:

```powershell
docker compose -f docker-compose.test.yml up -d --build test-db test-backend
$env:API_BASE_URL = "http://localhost:8081"
cd backend/tests
go test ./integration/... -v -count=1
```

## 격리 전략

- DB는 `tmpfs` 마운트라 컨테이너 재시작마다 깨끗하게 초기화됨
- 각 테스트는 **무작위 이메일**(`xxx-<hex>@test.local`)로 dev-login → 사용자 격리
- `GEMINI_API_KEY=""`로 띄워서 LLM mock 폴백 강제 (결정론적 출력)
- 운영용 `docker-compose.yml`과 포트 충돌 없음 (test-db: 5433, test-backend: 8081)

## 커버 범위

| FR-ID | 테스트 함수 | 비고 |
|---|---|---|
| FR-AUTH-01 | (수동) | 실 Google id_token 필요 |
| FR-AUTH-02 | `TestFR_AUTH_02_*` | dev-login + refresh + 401 가드 |
| FR-AUTH-03 | (수동) | 실 GCal OAuth 필요 |
| FR-GAME-01 | `TestFR_GAME_01_*` | 성향 설문 저장 |
| FR-GAME-03 | `TestFR_GAME_03_*` | 저레벨 ×1.5 가중치 |
| FR-GAME-04 | `TestFR_GAME_04_*` | 일일 퀘스트 3종 + 멱등성 |
| FR-GAME-05 | `TestFR_GAME_05_*` | 보상 공식 LOW/MED/HIGH + 일일 한도 200p |
| FR-TITLE-01 | `TestFR_TITLE_01_*` | 자동 부여 + 색상 + 장착 |
| FR-TITLE-04 | `TestFR_TITLE_04_*` | 방어권 시드 존재 (페널티 흐름은 API 미노출) |
| FR-SHOP-01 | `TestFR_SHOP_01_*` | 5종 시드 + 잔액 부족 거절 |
| FR-SHOP-03 | `TestFR_SHOP_03_*` | 3 카테고리 + PERSONA 부가 갱신 |
| FR-SOC-01 | `TestFR_SOC_01_03_*` | 쇼케이스 추천 목록 |
| FR-SOC-02 | `TestFR_SOC_02_*` | mock 폴백 + tsundere + sanitize |
| FR-SOC-03 | `TestFR_SOC_01_03_*` | 일정·실패율 비공개 |
| FR-NOTI-01 | `TestFR_NOTI_01_*` | 구독 등록 (발송은 외부 의존) |
| FR-STAT-01 | `TestFR_STAT_01_*` | 시계열 집계 |
| FR-STAT-02 | `TestFR_STAT_02_*` | 잔디 today 카운트 |

### 부가 회귀 테스트

- `TestListEndpointsNeverReturnNull` — 빈 list 응답이 `null`이 아님 (프론트 iterable 보장)
- `TestErrorEnvelopeShape` — 에러 envelope 형식
- `TestSchedulesCRUDFlow` — 일정 CRUD 라이프사이클
- `TestSchedulesBadDifficultyRejected` — 입력 검증
- `TestQuestCompletePlanAutoProgresses` — 완료 시 퀘스트 자동 진행
- `TestLevelFormulaConsistentWithMe` — `LevelFromExp` SSoT 공식 일치

## 수동 검증이 필요한 영역

- UI/UX (드래그앤드롭, 다크 테마, 반응형, RewardToast 시각 표현)
- Push 알림 실수신 (FCM 브로커 필요)
- Google OAuth 실 로그인
- Google Calendar 일정 import (FR-AUTH-03)
- 실 Google Gemini 응답 품질 (mock이 아닌 실 키 사용 시)

브라우저로 직접 시연하거나 Playwright/Cypress 추가 권장.
