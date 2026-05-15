package handlers

import (
	"net/http"

	"github.com/expcalendar/backend/internal/auth"
	"github.com/expcalendar/backend/internal/config"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	Cfg     *config.Config
	JWT     *auth.JWTManager
	Users   *repo.UserRepo
	Refresh *repo.RefreshRepo
	Titles  *repo.TitleRepo
}

func NewAuthHandler(cfg *config.Config, jwtMgr *auth.JWTManager, users *repo.UserRepo, refresh *repo.RefreshRepo, titles *repo.TitleRepo) *AuthHandler {
	return &AuthHandler{Cfg: cfg, JWT: jwtMgr, Users: users, Refresh: refresh, Titles: titles}
}

type googleLoginReq struct {
	IDToken string `json:"id_token"`
}

type devLoginReq struct {
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Google(c *gin.Context) {
	var req googleLoginReq
	if err := c.ShouldBindJSON(&req); err != nil || req.IDToken == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "id_token required")
		return
	}
	info, err := auth.VerifyGoogleIDToken(c.Request.Context(), req.IDToken, h.Cfg.GoogleOAuthClientID)
	if err != nil {
		RespondErr(c, http.StatusUnauthorized, "INVALID_ID_TOKEN", err.Error())
		return
	}
	u, err := h.Users.UpsertByEmail(c.Request.Context(), info.Email, info.Name, &info.Sub)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	h.issueTokens(c, u)
}

func (h *AuthHandler) DevLogin(c *gin.Context) {
	if !h.Cfg.DevMode {
		RespondErr(c, http.StatusForbidden, "DEV_MODE_DISABLED", "dev-login disabled")
		return
	}
	var req devLoginReq
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "email required")
		return
	}
	dn := req.DisplayName
	if dn == "" {
		dn = req.Email
	}
	u, err := h.Users.UpsertByEmail(c.Request.Context(), req.Email, dn, nil)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	h.issueTokens(c, u)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshReq
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		RespondErr(c, http.StatusBadRequest, "BAD_REQUEST", "refresh_token required")
		return
	}
	uid, exp, err := h.Refresh.Find(c.Request.Context(), req.RefreshToken)
	if err != nil {
		RespondErr(c, http.StatusUnauthorized, "INVALID_REFRESH", "unknown refresh token")
		return
	}
	if exp.Before(timeNow()) {
		_ = h.Refresh.Delete(c.Request.Context(), req.RefreshToken)
		RespondErr(c, http.StatusUnauthorized, "EXPIRED_REFRESH", "refresh token expired")
		return
	}
	access, err := h.JWT.IssueAccess(uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "JWT_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{"access_token": access})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	Respond(c, http.StatusOK, gin.H{"ok": true})
}

func (h *AuthHandler) issueTokens(c *gin.Context, u *models.User) {
	access, err := h.JWT.IssueAccess(u.ID)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "JWT_ERROR", err.Error())
		return
	}
	refresh, exp, err := h.JWT.IssueRefresh()
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "JWT_ERROR", err.Error())
		return
	}
	if err := h.Refresh.Store(c.Request.Context(), refresh, u.ID, exp); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, gin.H{
		"access_token":  access,
		"refresh_token": refresh,
		"user": gin.H{
			"id":           u.ID,
			"email":        u.Email,
			"display_name": u.DisplayName,
			"level":        u.Level,
		},
	})
}
