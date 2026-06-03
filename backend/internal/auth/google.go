package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"google.golang.org/api/idtoken"
)

// GoogleTokenInfo is the minimal subset of fields we use.
type GoogleTokenInfo struct {
	Sub     string
	Email   string
	Name    string
	Picture string
	Aud     string
}

// VerifyGoogleIDToken validates the id_token. Preferred path uses Google's
// idtoken library (offline RSA verification of JWT). If that fails for any
// reason and expectedAudience is empty, we fall back to the tokeninfo HTTP
// endpoint so the dev flow still works.
//
// If expectedAudience is non-empty it MUST match. Returning a typed info
// struct keeps the call sites unaware of the underlying mechanism.
func VerifyGoogleIDToken(ctx context.Context, idTok, expectedAudience string) (*GoogleTokenInfo, error) {
	if idTok == "" {
		return nil, errors.New("empty id_token")
	}

	// 1) Offline JWT verification via google.golang.org/api/idtoken
	if expectedAudience != "" {
		payload, err := idtoken.Validate(ctx, idTok, expectedAudience)
		if err == nil {
			info := &GoogleTokenInfo{
				Sub: payload.Subject,
				Aud: expectedAudience,
			}
			if v, ok := payload.Claims["email"].(string); ok {
				info.Email = v
			}
			if v, ok := payload.Claims["name"].(string); ok {
				info.Name = v
			}
			if v, ok := payload.Claims["picture"].(string); ok {
				info.Picture = v
			}
			if info.Sub == "" || info.Email == "" {
				return nil, errors.New("id_token missing sub/email")
			}
			return info, nil
		}
		return nil, fmt.Errorf("idtoken validate: %w", err)
	}

	// 2) Fallback: tokeninfo endpoint (no aud enforcement) — used when the
	//    expected audience is not configured (dev convenience).
	return verifyViaTokenInfo(ctx, idTok, expectedAudience)
}

type rawTokenInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`
	ErrorDesc     string `json:"error_description"`
}

func verifyViaTokenInfo(ctx context.Context, idTok, expectedAudience string) (*GoogleTokenInfo, error) {
	endpoint := "https://oauth2.googleapis.com/tokeninfo?id_token=" + url.QueryEscape(idTok)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tokeninfo request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tokeninfo non-200: %d", resp.StatusCode)
	}
	var info rawTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("decode tokeninfo: %w", err)
	}
	if info.ErrorDesc != "" {
		return nil, fmt.Errorf("tokeninfo error: %s", info.ErrorDesc)
	}
	if info.Sub == "" || info.Email == "" {
		return nil, errors.New("tokeninfo missing sub/email")
	}
	if expectedAudience != "" && info.Aud != expectedAudience {
		return nil, fmt.Errorf("audience mismatch: got %s", info.Aud)
	}
	return &GoogleTokenInfo{
		Sub: info.Sub, Email: info.Email, Name: info.Name, Picture: info.Picture, Aud: info.Aud,
	}, nil
}
