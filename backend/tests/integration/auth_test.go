package integration

import (
	"errors"
	"net/http"
	"testing"
)

// FR-AUTH-02: JWT access + refresh issuance and renewal.
// Google ID-token (FR-AUTH-01) and Calendar read (FR-AUTH-03) require external
// services and are exercised manually.
func TestFR_AUTH_02_DevLoginIssuesAccessAndRefresh(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("auth02")
	if c.Access == "" {
		t.Fatal("access token empty")
	}
	if c.Refresh == "" {
		t.Fatal("refresh token empty")
	}
	if c.UserID == "" {
		t.Fatal("user id empty")
	}
	// Authenticated /me must succeed with the issued access token.
	me := c.Me()
	if me.ID != c.UserID {
		t.Fatalf("me.id mismatch: want %s got %s", c.UserID, me.ID)
	}
	if me.AccountStatus != "ACTIVE" {
		t.Fatalf("expected ACTIVE, got %s", me.AccountStatus)
	}
}

func TestFR_AUTH_02_RefreshReissuesAccess(t *testing.T) {
	c := NewClient(t)
	c.LoginAsFresh("auth02-refresh")
	var resp struct {
		AccessToken string `json:"access_token"`
	}
	c.MustDo(http.MethodPost, "/api/auth/refresh", map[string]string{
		"refresh_token": c.Refresh,
	}, &resp)
	if resp.AccessToken == "" {
		t.Fatal("refresh did not return access_token")
	}
	// Whether the bytes are identical or not depends on JWT clock resolution
	// (HS256 iat/exp are seconds). The contract is that the new access token
	// authenticates — verify by exchanging it.
	c.Access = resp.AccessToken
	if me := c.Me(); me.ID != c.UserID {
		t.Fatalf("refreshed token failed to authenticate /me")
	}
}

func TestFR_AUTH_02_InvalidRefreshRejected(t *testing.T) {
	c := NewClient(t)
	status, _, err := c.RawDo(http.MethodPost, "/api/auth/refresh", map[string]string{
		"refresh_token": "this-token-does-not-exist",
	})
	if err != nil {
		t.Fatal(err)
	}
	if status != http.StatusUnauthorized {
		t.Fatalf("want 401 for invalid refresh, got %d", status)
	}
}

// CI-03 / middleware: protected routes must reject unauthenticated calls.
func TestProtectedRoutesReturn401(t *testing.T) {
	c := NewClient(t) // no token
	cases := []struct {
		method, path string
	}{
		{http.MethodGet, "/api/me"},
		{http.MethodGet, "/api/schedules"},
		{http.MethodGet, "/api/quests/today"},
		{http.MethodGet, "/api/shop/items"},
		{http.MethodGet, "/api/titles/me"},
		{http.MethodGet, "/api/showcase"},
		{http.MethodGet, "/api/stats/grass"},
	}
	for _, tc := range cases {
		t.Run(tc.method+"_"+tc.path, func(t *testing.T) {
			status, _, _ := c.RawDo(tc.method, tc.path, nil)
			if status != http.StatusUnauthorized {
				t.Fatalf("%s %s: want 401, got %d", tc.method, tc.path, status)
			}
		})
	}
}

func TestInvalidBearerRejected(t *testing.T) {
	c := NewClient(t)
	c.Access = "not.a.real.jwt"
	err := c.Do(http.MethodGet, "/api/me", nil, nil)
	var apiErr *APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("expected APIError, got %v", err)
	}
	if apiErr.Status != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", apiErr.Status)
	}
}

// DC-related: dev-login itself must be disabled in production (DEV_MODE=false).
// We only assert the route is wired and functional under test DEV_MODE=true.
func TestDevLoginRouteIsPublic(t *testing.T) {
	c := NewClient(t)
	status, _, _ := c.RawDo(http.MethodPost, "/api/auth/dev-login", map[string]string{
		"email":        RandomEmail("publiccheck"),
		"display_name": "pub",
	})
	if status != http.StatusOK {
		t.Fatalf("dev-login (DEV_MODE=true) want 200, got %d", status)
	}
}
