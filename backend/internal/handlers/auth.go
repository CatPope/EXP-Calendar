package handlers

import (
	"errors"
	"net/http"

	"github.com/expcalendar/backend/internal/auth"
	"github.com/expcalendar/backend/internal/config"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type AuthHandler struct {
	Cfg         *config.Config
	JWT         *auth.JWTManager
	Users       *repo.UserRepo
	RefreshRepo *repo.RefreshRepo
	Titles      *repo.TitleRepo
}

func NewAuthHandler(cfg *config.Config, jwtMgr *auth.JWTManager, users *repo.UserRepo, refresh *repo.RefreshRepo, titles *repo.TitleRepo) *AuthHandler {
	return &AuthHandler{Cfg: cfg, JWT: jwtMgr, Users: users, RefreshRepo: refresh, Titles: titles}
}

type googleLoginReq struct {
	IDToken string `json:"id_token"`
}

type devLoginReq struct {
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
	Password    string `json:"password"`
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

type accessTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type loginUser struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"display_name"`
	Level       int       `json:"level"`
}

type loginResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	User         loginUser `json:"user"`
}

func (h *AuthHandler) Google(c *gin.Context) {
	req, ok := BindAndValidate(c, func(r *googleLoginReq) error {
		if r.IDToken == "" {
			return errors.New("id_token required")
		}
		return nil
	})
	if !ok {
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

// DevLogin authenticates an EXISTING account only. Unknown emails are rejected
// with NEED_SIGNUP so the client can route to the signup flow.
//
// 비밀번호 정책:
//   - 사용자가 password_hash 를 보유한 경우 → password 필수, bcrypt 비교.
//   - 보유하지 않은 경우(legacy) → password 무시하고 로그인 허용.
func (h *AuthHandler) DevLogin(c *gin.Context) {
	if !h.Cfg.DevMode {
		RespondErr(c, http.StatusForbidden, "DEV_MODE_DISABLED", "dev-login disabled")
		return
	}
	req, ok := BindAndValidate(c, func(r *devLoginReq) error {
		if r.Email == "" {
			return errors.New("email required")
		}
		return nil
	})
	if !ok {
		return
	}
	u, err := h.Users.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			RespondErr(c, http.StatusNotFound, "NEED_SIGNUP", "등록되지 않은 계정입니다. 회원가입이 필요합니다.")
			return
		}
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if u.PasswordHash != "" {
		if req.Password == "" {
			RespondErr(c, http.StatusBadRequest, "PASSWORD_REQUIRED", "비밀번호를 입력해 주세요.")
			return
		}
		if !auth.VerifyPassword(u.PasswordHash, req.Password) {
			RespondErr(c, http.StatusUnauthorized, "INVALID_PASSWORD", "비밀번호가 일치하지 않습니다.")
			return
		}
	}
	_ = h.Users.EnsureMinPoints(c.Request.Context(), u.ID, 999999)
	_ = h.Users.EnsureMinPersonaTokens(c.Request.Context(), u.ID, 10)
	h.issueTokens(c, u)
}

// DevSignup creates a NEW account. Existing emails are rejected with
// ALREADY_EXISTS so the client can route to the login flow.
// password 는 필수이며 bcrypt 로 hash 해 저장한다.
func (h *AuthHandler) DevSignup(c *gin.Context) {
	if !h.Cfg.DevMode {
		RespondErr(c, http.StatusForbidden, "DEV_MODE_DISABLED", "dev-signup disabled")
		return
	}
	req, ok := BindAndValidate(c, func(r *devLoginReq) error {
		if r.Email == "" {
			return errors.New("email required")
		}
		if r.Password == "" {
			return errors.New("password required")
		}
		return nil
	})
	if !ok {
		return
	}
	if _, err := h.Users.GetByEmail(c.Request.Context(), req.Email); err == nil {
		RespondErr(c, http.StatusConflict, "ALREADY_EXISTS", "이미 가입된 계정입니다. 로그인해 주세요.")
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	dn := req.DisplayName
	if dn == "" {
		dn = req.Email
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "HASH_ERROR", err.Error())
		return
	}
	u, err := h.Users.UpsertByEmail(c.Request.Context(), req.Email, dn, nil)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	if err := h.Users.SetPasswordHash(c.Request.Context(), u.ID, hash); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	_ = h.Users.EnsureMinPoints(c.Request.Context(), u.ID, 999999)
	_ = h.Users.EnsureMinPersonaTokens(c.Request.Context(), u.ID, 10)
	h.issueTokens(c, u)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	req, ok := BindAndValidate(c, func(r *refreshReq) error {
		if r.RefreshToken == "" {
			return errors.New("refresh_token required")
		}
		return nil
	})
	if !ok {
		return
	}
	uid, exp, err := h.RefreshRepo.Find(c.Request.Context(), req.RefreshToken)
	if err != nil {
		RespondErr(c, http.StatusUnauthorized, "INVALID_REFRESH", "unknown refresh token")
		return
	}
	if exp.Before(timeNow()) {
		_ = h.RefreshRepo.Delete(c.Request.Context(), req.RefreshToken)
		RespondErr(c, http.StatusUnauthorized, "EXPIRED_REFRESH", "refresh token expired")
		return
	}
	access, err := h.JWT.IssueAccess(uid)
	if err != nil {
		RespondErr(c, http.StatusInternalServerError, "JWT_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, accessTokenResponse{AccessToken: access})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	Respond(c, http.StatusOK, okResponse{OK: true})
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
	if err := h.RefreshRepo.Store(c.Request.Context(), refresh, u.ID, exp); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, loginResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		User: loginUser{
			ID:          u.ID,
			Email:       u.Email,
			DisplayName: u.DisplayName,
			Level:       u.Level,
		},
	})
}
