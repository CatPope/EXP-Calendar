package integration

import (
	"net/http"
	"strings"
	"testing"
)

// Regression for the "a is not iterable" frontend crash: every list endpoint
// must return a JSON array/object (not null) when empty.
func TestListEndpointsNeverReturnNull(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("envelopeguard")
	c.Onboard("NORMAL")

	cases := []struct {
		path    string
		wantRaw string // exact body for a fresh user with no data
	}{
		{"/api/schedules?from=2000-01-01&to=2000-01-02", `{"data":[]}`},
		{"/api/titles/me", `{"data":[]}`},
		{"/api/stats/grass", `{"data":{}}`},
		{"/api/stats/series?period=week", `{"data":[]}`},
	}
	for _, tc := range cases {
		t.Run(strings.ReplaceAll(tc.path, "/", "_"), func(t *testing.T) {
			status, raw, err := c.RawDo(http.MethodGet, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			if status != 200 {
				t.Fatalf("status %d", status)
			}
			if string(raw) != tc.wantRaw {
				t.Fatalf("want %s, got %s", tc.wantRaw, string(raw))
			}
		})
	}
}

// Error envelope shape: {"error":{"code","message"}}.
func TestErrorEnvelopeShape(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("errshape")
	c.Onboard("NORMAL")
	// Trigger BAD_REQUEST via missing title.
	status, raw, _ := c.RawDo(http.MethodPost, "/api/schedules", map[string]any{
		"difficulty": "LOW",
		"due_date":   "2026-05-20T10:00:00Z",
	})
	if status != http.StatusBadRequest {
		t.Fatalf("want 400, got %d :: %s", status, raw)
	}
	body := string(raw)
	if !strings.Contains(body, `"error"`) || !strings.Contains(body, `"code"`) || !strings.Contains(body, `"message"`) {
		t.Fatalf("error envelope malformed: %s", body)
	}
}
