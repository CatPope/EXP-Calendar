package handlers

import (
	"errors"
	"net/http"

	"github.com/expcalendar/backend/internal/game"
	"github.com/expcalendar/backend/internal/middleware"
	"github.com/expcalendar/backend/internal/models"
	"github.com/expcalendar/backend/internal/repo"
	"github.com/gin-gonic/gin"
)

type MeHandler struct {
	Users  *repo.UserRepo
	Titles *repo.TitleRepo
}

func NewMeHandler(u *repo.UserRepo, t *repo.TitleRepo) *MeHandler {
	return &MeHandler{Users: u, Titles: t}
}

// meResponse mirrors the legacy gin.H payload one-for-one; declared as a
// named anon-style struct so callers can rely on field order/keys.
type meResponse struct {
	ID                   any    `json:"id"`
	Email                string `json:"email"`
	DisplayName          string `json:"display_name"`
	Level                int    `json:"level"`
	TotalExp             int    `json:"total_exp"`
	ExpToNextLevel       int    `json:"exp_to_next_level"`
	CurrentPoints        int    `json:"current_points"`
	DailyPointsEarned    int    `json:"daily_points_earned"`
	DailyPointsCap       int    `json:"daily_points_cap"`
	AccountStatus        string `json:"account_status"`
	PersonaCharacterType string `json:"persona_character_type"`
	PersonaDefinition    string `json:"persona_definition"`
	PersonaTokens        int    `json:"persona_tokens"`
	CharacterSkin        string `json:"character_skin"`
	EquippedTitle        any    `json:"equipped_title"`
	Tendency             string `json:"tendency"`
}

func (h *MeHandler) Get(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	u, err := h.Users.GetByID(c.Request.Context(), uid)
	if err != nil {
		RespondErr(c, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}

	equipped, _ := h.Titles.EquippedFor(c.Request.Context(), uid)
	var equippedJSON any = nil
	if equipped != nil {
		equippedJSON = models.EquippedTitle{
			ID:               equipped.Title.ID,
			Name:             equipped.Title.Name,
			Grade:            equipped.Title.Grade,
			ColorHex:         equipped.Title.ColorHex,
			NegativeModifier: equipped.NegativeModifier,
		}
	}
	Respond(c, http.StatusOK, meResponse{
		ID:                   u.ID,
		Email:                u.Email,
		DisplayName:          u.DisplayName,
		Level:                u.Level,
		TotalExp:             u.TotalExp,
		ExpToNextLevel:       game.ExpToNextLevel(u.Level, u.TotalExp),
		CurrentPoints:        u.CurrentPoints,
		DailyPointsEarned:    u.DailyPointsEarned,
		DailyPointsCap:       game.DailyPointsCap(),
		AccountStatus:        u.AccountStatus,
		PersonaCharacterType: u.PersonaCharacterType,
		PersonaDefinition:    u.PersonaDefinition,
		PersonaTokens:        u.PersonaTokens,
		CharacterSkin:        u.CharacterSkin,
		EquippedTitle:        equippedJSON,
		Tendency:             u.Tendency,
	})
}

type characterReq struct {
	Skin string `json:"skin"`
}

// SetCharacter persists the user's chosen 2D character skin id.
func (h *MeHandler) SetCharacter(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *characterReq) error {
		if r.Skin == "" {
			return errors.New("skin required")
		}
		if len(r.Skin) > 40 {
			return errors.New("skin id too long")
		}
		return nil
	})
	if !ok {
		return
	}
	if err := h.Users.SetCharacterSkin(c.Request.Context(), uid, req.Skin); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}

type onboardingReq struct {
	Tendency string `json:"tendency"`
}

type okResponse struct {
	OK bool `json:"ok"`
}

func (h *MeHandler) Onboarding(c *gin.Context) {
	uid, ok := middleware.GetUserID(c)
	if !ok {
		RespondErr(c, http.StatusUnauthorized, "UNAUTHORIZED", "missing user id")
		return
	}
	req, ok := BindAndValidate(c, func(r *onboardingReq) error {
		switch r.Tendency {
		case "EASY", "NORMAL", "HARD":
			return nil
		case "":
			return errors.New("tendency required")
		default:
			return errors.New("tendency must be EASY|NORMAL|HARD")
		}
	})
	if !ok {
		return
	}
	if err := h.Users.SetTendency(c.Request.Context(), uid, req.Tendency); err != nil {
		RespondErr(c, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}
	Respond(c, http.StatusOK, okResponse{OK: true})
}
