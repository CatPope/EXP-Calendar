package integration

import (
	"net/http"
	"testing"
	"time"
)

// FR-STAT-02: GitHub-style 잔디. 일정 완료 직후 오늘 칸 카운트 1 증가.
func TestFR_STAT_02_GrassReflectsTodayCompletion(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("stat02")
	c.Onboard("NORMAL")

	now := time.Now().UTC()
	todayKey := now.Format("2006-01-02")
	before := c.Grass()
	beforeCount := before[todayKey]

	s := c.CreateSchedule("grass", "LOW", time0Today23())
	c.CompleteSchedule(s.ID)

	after := c.Grass()
	if after[todayKey] != beforeCount+1 {
		t.Fatalf("today grass: before=%d after=%d (full=%+v)",
			beforeCount, after[todayKey], after)
	}
}

// 빈 잔디 응답이 null이 아닌 {} 인지(프론트가 그대로 iterate/spread 가능).
func TestStatsEmptyContainersAreNotNull(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("statempty")
	c.Onboard("NORMAL")
	status, raw, err := c.RawDo(http.MethodGet, "/api/stats/grass", nil)
	if err != nil {
		t.Fatal(err)
	}
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	if string(raw) != `{"data":{}}` {
		t.Fatalf("empty grass want {\"data\":{}}, got %s", string(raw))
	}

	status, raw, _ = c.RawDo(http.MethodGet, "/api/stats/series?period=week", nil)
	if status != 200 {
		t.Fatalf("series status %d", status)
	}
	if string(raw) != `{"data":[]}` {
		t.Fatalf("empty series want {\"data\":[]}, got %s", string(raw))
	}
}

// FR-STAT-01: 시계열 — 같은 날 due 일정이 1주 윈도우에 포함되면 success +1.
func TestFR_STAT_01_SeriesAggregation(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("stat01")
	c.Onboard("NORMAL")
	s := c.CreateSchedule("ser", "LOW", time0Today23())
	c.CompleteSchedule(s.ID)

	rows := c.Series("week")
	if len(rows) == 0 {
		t.Fatal("series empty after a same-day-due completion")
	}
	today := time.Now().UTC().Format("2006-01-02")
	var found bool
	for _, r := range rows {
		if d, _ := r["date"].(string); d == today {
			found = true
			if succ, _ := r["success"].(float64); succ < 1 {
				t.Fatalf("today success want ≥1, got %v", r)
			}
		}
	}
	if !found {
		t.Fatalf("today not in series rows: %+v", rows)
	}
}

// /api/schedules: 빈 결과도 []로 응답 (frontend iterable guarantee).
func TestSchedulesEmptyReturnsArray(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("schemtpy")
	c.Onboard("NORMAL")
	status, raw, err := c.RawDo(http.MethodGet, "/api/schedules?from=2000-01-01&to=2000-01-02", nil)
	if err != nil {
		t.Fatal(err)
	}
	if status != 200 {
		t.Fatalf("status %d", status)
	}
	if string(raw) != `{"data":[]}` {
		t.Fatalf("want {\"data\":[]}, got %s", string(raw))
	}
}

// FR-NOTI-01: Push 구독 등록 자체는 동기 응답으로 확인 가능. 실 발송은 외부 의존.
func TestFR_NOTI_01_PushSubscribeAccepts(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("noti01")
	c.Onboard("NORMAL")
	c.SubscribePush(
		"https://example.test/push/endpoint",
		"BJxxx-base64key",
		"auth-base64",
	)
	// no assertion beyond no-error; the endpoint just persists the subscription.
}
