// Package integration provides a thin HTTP test client wrapping the EXP Calendar
// public API surface. Tests use NewClient(t) → DevLogin → typed helpers per
// resource. The envelope ({"data":...} / {"error":{code,message}}) is unwrapped
// here so individual tests can assert on payloads directly.
package integration

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"testing"
	"time"

	"crypto/rand"
	"encoding/hex"
)

// Client is a per-test HTTP client. Construct via NewClient(t).
type Client struct {
	t       *testing.T
	BaseURL string
	HTTP    *http.Client
	Access  string
	Refresh string
	UserID  string
	Email   string
}

func baseURL() string {
	if v := os.Getenv("API_BASE_URL"); v != "" {
		return v
	}
	return "http://localhost:8081"
}

// NewClient returns an unauthenticated client.
func NewClient(t *testing.T) *Client {
	t.Helper()
	return &Client{
		t:       t,
		BaseURL: baseURL(),
		HTTP:    &http.Client{Timeout: 10 * time.Second},
	}
}

// RandomEmail returns a unique email so each test gets its own isolated user.
func RandomEmail(prefix string) string {
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	return prefix + "-" + hex.EncodeToString(b) + "@test.local"
}

// envelope mirrors the {data} / {error} JSON shape.
type envelope struct {
	Data  json.RawMessage `json:"data,omitempty"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// APIError carries a non-2xx envelope error from the server.
type APIError struct {
	Status  int
	Code    string
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API %d %s: %s", e.Status, e.Code, e.Message)
}

// Do executes a request and decodes the data envelope into `out`. Returns an
// *APIError when the server returned {"error":...}.
func (c *Client) Do(method, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequest(method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.Access != "" {
		req.Header.Set("Authorization", "Bearer "+c.Access)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var env envelope
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &env); err != nil {
			return fmt.Errorf("decode envelope (%d): %w :: %s", resp.StatusCode, err, string(raw))
		}
	}
	if env.Error != nil {
		return &APIError{Status: resp.StatusCode, Code: env.Error.Code, Message: env.Error.Message}
	}
	if resp.StatusCode/100 != 2 {
		return &APIError{Status: resp.StatusCode, Code: "HTTP_" + fmt.Sprint(resp.StatusCode), Message: string(raw)}
	}
	if out != nil && len(env.Data) > 0 {
		if err := json.Unmarshal(env.Data, out); err != nil {
			return fmt.Errorf("decode data: %w :: %s", err, string(env.Data))
		}
	}
	return nil
}

// RawDo returns the raw response body and status (used when a test must inspect
// the envelope shape itself, e.g. distinguishing data=null vs data=[]).
func (c *Client) RawDo(method, path string, body any) (int, []byte, error) {
	var reader io.Reader
	if body != nil {
		buf, _ := json.Marshal(body)
		reader = bytes.NewReader(buf)
	}
	req, err := http.NewRequest(method, c.BaseURL+path, reader)
	if err != nil {
		return 0, nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.Access != "" {
		req.Header.Set("Authorization", "Bearer "+c.Access)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, raw, nil
}

// MustDo wraps Do and fails the test on error.
func (c *Client) MustDo(method, path string, body any, out any) {
	c.t.Helper()
	if err := c.Do(method, path, body, out); err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
}

// ---------- Auth helpers ----------

type authResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID          string `json:"id"`
		Email       string `json:"email"`
		DisplayName string `json:"display_name"`
		Level       int    `json:"level"`
	} `json:"user"`
}

// DevLogin issues tokens for a fresh email (DEV_MODE must be true on the
// backend). Stores tokens + user id on the client.
func (c *Client) DevLogin(email, displayName string) {
	c.t.Helper()
	var resp authResp
	c.MustDo(http.MethodPost, "/api/auth/dev-login", map[string]string{
		"email":        email,
		"display_name": displayName,
	}, &resp)
	if resp.AccessToken == "" || resp.User.ID == "" {
		c.t.Fatalf("dev-login returned empty token/user: %+v", resp)
	}
	c.Access = resp.AccessToken
	c.Refresh = resp.RefreshToken
	c.UserID = resp.User.ID
	c.Email = resp.User.Email
}

// LoginAsFresh wraps DevLogin with a random email so each test is isolated.
func (c *Client) LoginAsFresh(prefix string) {
	c.t.Helper()
	c.DevLogin(RandomEmail(prefix), prefix)
}
