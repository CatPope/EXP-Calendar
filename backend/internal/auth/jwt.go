package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTManager struct {
	secret        []byte
	accessTTLMin  int
	refreshTTLDay int
}

func NewJWTManager(secret string, accessTTLMin, refreshTTLDay int) *JWTManager {
	return &JWTManager{secret: []byte(secret), accessTTLMin: accessTTLMin, refreshTTLDay: refreshTTLDay}
}

func (j *JWTManager) AccessTTL() time.Duration {
	return time.Duration(j.accessTTLMin) * time.Minute
}

func (j *JWTManager) RefreshTTL() time.Duration {
	return time.Duration(j.refreshTTLDay) * 24 * time.Hour
}

type Claims struct {
	UserID string `json:"uid"`
	jwt.RegisteredClaims
}

func (j *JWTManager) IssueAccess(userID uuid.UUID) (string, error) {
	claims := &Claims{
		UserID: userID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(j.AccessTTL())),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(j.secret)
}

// IssueRefresh returns an opaque random token (not a JWT) so it can be stored
// and revoked. The caller is expected to persist (token, user_id, expires_at).
func (j *JWTManager) IssueRefresh() (string, time.Time, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", time.Time{}, err
	}
	tok := hex.EncodeToString(buf)
	return tok, time.Now().Add(j.RefreshTTL()), nil
}

func (j *JWTManager) ParseAccess(tokenStr string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return j.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
