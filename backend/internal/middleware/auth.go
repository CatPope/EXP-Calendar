package middleware

import (
	"net/http"
	"strings"

	"github.com/expcalendar/backend/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const CtxUserIDKey = "user_id"

// AuthRequired returns a Gin middleware that validates the Authorization
// bearer access token and stores the user UUID under CtxUserIDKey.
func AuthRequired(jwtMgr *auth.JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if h == "" || !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "missing bearer token"},
			})
			return
		}
		tok := strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
		claims, err := jwtMgr.ParseAccess(tok)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "invalid token"},
			})
			return
		}
		uid, err := uuid.Parse(claims.UserID)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{"code": "UNAUTHORIZED", "message": "invalid subject"},
			})
			return
		}
		c.Set(CtxUserIDKey, uid)
		c.Next()
	}
}

// MustUserID extracts the authenticated user id stored by AuthRequired.
// Kept for backwards compatibility; new code should prefer GetUserID.
func MustUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(CtxUserIDKey)
	uid, _ := v.(uuid.UUID)
	return uid
}

// GetUserID is the safe extraction variant: returns (uid, true) when present
// and a non-nil UUID, otherwise (uuid.Nil, false). Handlers should treat the
// false branch as 401 UNAUTHORIZED — it indicates AuthRequired did not run
// or the value was overwritten.
func GetUserID(c *gin.Context) (uuid.UUID, bool) {
	v, exists := c.Get(CtxUserIDKey)
	if !exists {
		return uuid.Nil, false
	}
	uid, ok := v.(uuid.UUID)
	if !ok || uid == uuid.Nil {
		return uuid.Nil, false
	}
	return uid, true
}
