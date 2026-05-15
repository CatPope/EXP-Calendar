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
func MustUserID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(CtxUserIDKey)
	uid, _ := v.(uuid.UUID)
	return uid
}
